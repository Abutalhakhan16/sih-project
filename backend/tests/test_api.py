"""Essential end-to-end checks for the seeded development API."""
import os
from pathlib import Path

TEST_DB = "/private/tmp/coopserve-pytest.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB}"
os.environ["DATABASE_URL_SYNC"] = f"sqlite:///{TEST_DB}"
os.environ["DEBUG"] = "false"

from fastapi.testclient import TestClient  # noqa: E402
from backend.app.main import app  # noqa: E402

def auth(client, email, password="demo123"):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}

def test_registration_login_and_protected_routes():
    Path(TEST_DB).unlink(missing_ok=True)
    with TestClient(app) as client:
        registered = client.post("/api/auth/register", json={"name":"Test Customer","email":"test@example.com","password":"secure-pass-123","role":"customer"})
        assert registered.status_code == 201
        assert client.get("/api/bookings").status_code == 401
        assert client.get("/api/admin/dashboard", headers=auth(client, "customer@coopserve.demo")).status_code == 403

def test_matching_booking_payment_and_rating_flow():
    with TestClient(app) as client:
        customer_headers = auth(client, "customer@coopserve.demo")
        nearby = client.get("/api/workers/nearby", params={"latitude":12.9716,"longitude":77.5946,"service":"Plumber","radius":15}, headers=customer_headers)
        assert nearby.status_code == 200
        worker = nearby.json()["bestWorker"]
        assert worker and worker["isEligible"]
        booking_response = client.post("/api/bookings", headers=customer_headers, json={"worker_id":worker["id"],"service":"Plumber","customer_lat":12.9716,"customer_lng":77.5946,"address":"Test address","amount":450})
        assert booking_response.status_code == 201
        booking = booking_response.json()
        worker_headers = auth(client, f"worker{worker['id']}@coopserve.demo")
        for next_status in ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"]:
            assert client.put(f"/api/bookings/{booking['id']}/status", headers=worker_headers, json={"status":next_status}).status_code == 200
        payment = client.post("/api/payments/create", headers=customer_headers, json={"booking_id":booking["id"]})
        assert payment.status_code == 200
        assert client.post("/api/payments/verify", headers=customer_headers, json={"booking_id":booking["id"],"transaction_reference":payment.json()["transaction_reference"]}).status_code == 200
        assert client.post("/api/ratings", headers=customer_headers, json={"booking_id":booking["id"],"rating":5,"review":"Excellent demo service"}).status_code == 201

def test_worker_registration_and_filtering():
    with TestClient(app) as client:
        res = client.post("/api/auth/register", json={
            "name": "New Worker Test",
            "email": "newworker@example.com",
            "password": "secure-pass-123",
            "role": "worker",
            "service": "Electrician",
            "experience_years": 4,
            "hourly_rate": 500,
            "latitude": 12.9720,
            "longitude": 77.5950
        })
        assert res.status_code == 201
        assert res.json()["user"]["role"] == "worker"
        
        # Test worker filtering
        workers = client.get("/api/workers", params={"service": "Electrician"}).json()
        assert len(workers) > 0
        assert all("Electrician" in (w["service"] + " " + w["primarySkill"]) for w in workers)

def test_invalid_booking_transition_is_rejected():
    with TestClient(app) as client:
        customer_headers = auth(client, "customer@coopserve.demo")
        existing = client.get("/api/bookings", headers=customer_headers).json()[0]
        assert client.put(f"/api/bookings/{existing['id']}/status", headers=customer_headers, json={"status":"REQUESTED"}).status_code in {403, 409}

def test_admin_dashboard_and_worker_verification():
    with TestClient(app) as client:
        admin_headers = auth(client, "admin@coopserve.demo", password="admin123")
        
        # Dashboard analytics
        dash = client.get("/api/admin/dashboard", headers=admin_headers)
        assert dash.status_code == 200
        data = dash.json()
        assert "totalWorkers" in data
        assert "verifiedWorkers" in data
        assert "activeJobs" in data
        assert "revenue" in data
        assert "topServices" in data

        # Admin bookings list
        b_res = client.get("/api/admin/bookings", headers=admin_headers)
        assert b_res.status_code == 200
        assert isinstance(b_res.json(), list)

        # Worker verification approval
        workers = client.get("/api/admin/workers", headers=admin_headers).json()
        assert len(workers) > 0
        w_id = workers[0]["id"]
        verify_res = client.put(f"/api/admin/workers/{w_id}/verify", headers=admin_headers, json={"verification_status": "VERIFIED"})
        assert verify_res.status_code == 200
        assert verify_res.json()["verificationStatus"] == "VERIFIED"

def test_notifications_lifecycle():
    with TestClient(app) as client:
        cust_headers = auth(client, "customer@coopserve.demo")
        notifs = client.get("/api/notifications", headers=cust_headers).json()
        assert isinstance(notifs, list)
        if notifs:
            first_id = notifs[0]["id"]
            read_res = client.put(f"/api/notifications/{first_id}/read", headers=cust_headers)
            assert read_res.status_code == 200
            assert read_res.json()["read"] is True

def test_ai_forecast_and_workforce_recommendation():
    with TestClient(app) as client:
        admin_headers = auth(client, "admin@coopserve.demo", password="admin123")
        
        fc = client.get("/api/ai/forecast", params={"service": "Plumber", "location": "Central Zone"}, headers=admin_headers)
        assert fc.status_code == 200
        assert "expected_requests" in fc.json()
        assert fc.json()["location"] == "Central Zone"

        rec = client.get("/api/ai/workforce-recommendation", params={"service": "Plumber", "location": "Central Zone"}, headers=admin_headers)
        assert rec.status_code == 200
        rec_data = rec.json()
        assert "predictedDemand" in rec_data
        assert "availableSupply" in rec_data
        assert "recommendation" in rec_data


def test_chat_customer_hindi_plumbing_and_booking_flow():
    """Acceptance Flow: Customer Hindi 'मुझे प्लंबर चाहिए' -> matches worker -> confirms booking."""
    with TestClient(app) as client:
        cust_headers = auth(client, "customer@coopserve.demo")

        # 1. Hindi service request
        res1 = client.post(
            "/api/chat/message",
            headers=cust_headers,
            json={"message": "मुझे प्लंबर चाहिए", "language": "hi", "latitude": 12.9716, "longitude": 77.5946}
        )
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["intent"] == "MATCH_WORKER"
        assert data1["action"] is not None
        assert data1["action"]["action_type"] == "worker_recommendation"
        assert "bestWorker" in data1["action"]["data"]
        worker_name = data1["action"]["data"]["bestWorker"]["name"]
        assert len(worker_name) > 0

        # 2. Confirm booking via chat
        res2 = client.post(
            "/api/chat/message",
            headers=cust_headers,
            json={"message": "हाँ बुक करो", "language": "hi"}
        )
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["intent"] == "CREATE_BOOKING"
        assert data2["action"] is not None
        assert data2["action"]["action_type"] == "booking_confirmed"
        assert "bookingId" in data2["action"]["data"]
        assert data2["action"]["data"]["bookingId"] > 0


def test_chat_customer_active_booking_tracking():
    """Acceptance Flow: Customer 'Where is my worker?' fetches actual booking."""
    with TestClient(app) as client:
        cust_headers = auth(client, "customer@coopserve.demo")
        res = client.post(
            "/api/chat/message",
            headers=cust_headers,
            json={"message": "Where is my worker?", "language": "en"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["intent"] == "TRACK_BOOKING"
        assert data["action"] is not None
        assert data["action"]["action_type"] == "booking_status"
        b_data = data["action"]["data"]
        assert "status" in b_data
        assert "worker" in b_data
        assert "etaMinutes" in b_data


def test_chat_customer_emergency_service():
    """Acceptance Flow: Customer urgent request classified as HIGH PRIORITY with emergency warning."""
    with TestClient(app) as client:
        cust_headers = auth(client, "customer@coopserve.demo")
        res = client.post(
            "/api/chat/message",
            headers=cust_headers,
            json={"message": "There is an electrical short circuit and sparks in the main switch", "language": "en"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["intent"] == "EMERGENCY_SERVICE"
        assert data["action"] is not None
        assert data["action"]["action_type"] == "emergency_alert"
        assert data["action"]["data"]["priority"] == "HIGH PRIORITY"
        # Safety advisory present
        assert "112" in data["message"] or "emergency" in data["message"].lower()


def test_chat_worker_pending_jobs_and_earnings():
    """Acceptance Flow: Worker asks for pending jobs, earnings, and sets availability."""
    with TestClient(app) as client:
        worker_headers = auth(client, "worker1@coopserve.demo")

        # 1. Pending jobs
        res_jobs = client.post(
            "/api/chat/message",
            headers=worker_headers,
            json={"message": "Show my pending jobs"}
        )
        assert res_jobs.status_code == 200
        assert res_jobs.json()["intent"] == "WORKER_PENDING_JOBS"

        # 2. Earnings
        res_earn = client.post(
            "/api/chat/message",
            headers=worker_headers,
            json={"message": "How much did I earn this week?"}
        )
        assert res_earn.status_code == 200
        data_earn = res_earn.json()
        assert data_earn["intent"] == "WORKER_EARNINGS"
        assert data_earn["action"] is not None
        assert data_earn["action"]["action_type"] == "worker_stats"

        # 3. Availability
        res_avail = client.post(
            "/api/chat/message",
            headers=worker_headers,
            json={"message": "Set me as available"}
        )
        assert res_avail.status_code == 200
        assert res_avail.json()["intent"] == "WORKER_AVAILABILITY"


def test_chat_admin_analytics_and_highest_demand():
    """Acceptance Flow: Admin asks 'Which zone has the highest demand?'."""
    with TestClient(app) as client:
        admin_headers = auth(client, "admin@coopserve.demo", password="admin123")

        res_demand = client.post(
            "/api/chat/message",
            headers=admin_headers,
            json={"message": "Which zone has the highest demand?"}
        )
        assert res_demand.status_code == 200
        data_demand = res_demand.json()
        assert data_demand["intent"] == "ADMIN_DEMAND_QUERY"
        assert data_demand["action"] is not None
        assert data_demand["action"]["action_type"] == "admin_analytics"
        assert "Bengaluru" in data_demand["action"]["data"]["highestDemandZone"]


def test_chat_bilingual_faq_and_history():
    """Acceptance Flow: English and Hindi FAQ + history retrieval and clearing."""
    with TestClient(app) as client:
        cust_headers = auth(client, "customer@coopserve.demo")

        # English FAQ
        res_en = client.post(
            "/api/chat/message",
            headers=cust_headers,
            json={"message": "How are workers verified?", "language": "en"}
        )
        assert res_en.status_code == 200
        assert "verified" in res_en.json()["message"].lower()

        # Hindi FAQ
        res_hi = client.post(
            "/api/chat/message",
            headers=cust_headers,
            json={"message": "भुगतान और फीस कैसे काम करती है?", "language": "hi"}
        )
        assert res_hi.status_code == 200
        assert "75%" in res_hi.json()["message"] or "सहकारी" in res_hi.json()["message"]

        # History check
        hist = client.get("/api/chat/history", headers=cust_headers)
        assert hist.status_code == 200
        assert len(hist.json()["messages"]) > 0

        # Clear history
        clear = client.delete("/api/chat/history", headers=cust_headers)
        assert clear.status_code == 200
        hist_empty = client.get("/api/chat/history", headers=cust_headers)
        assert len(hist_empty.json()["messages"]) == 0

