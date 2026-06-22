"""
VoltGo EV Logistics Platform — backend regression tests.
Covers: auth (OTP), vehicles, fare, bookings, driver, admin, payments, RBAC.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://electric-dispatch-5.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CUSTOMER_PHONE = "+911111111111"
DRIVER_PHONE = "+912222222222"  # vehicle veh-2w-ev (EV Scooter)
DRIVER2_PHONE = "+912222222223"  # veh-3w-ev
ADMIN_PHONE = "+919999999999"
NEW_PHONE = "+919900100200"  # for auto-create test


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(session, phone, role, name=None):
    r = session.post(f"{API}/auth/verify-otp", json={"phone": phone, "otp": "1234", "role": role, "name": name})
    assert r.status_code == 200, f"login failed {phone} {role}: {r.text}"
    data = r.json()
    return data["token"], data["user"]


@pytest.fixture(scope="session")
def customer_auth(session):
    token, user = _login(session, CUSTOMER_PHONE, "customer")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, user


@pytest.fixture(scope="session")
def driver_auth(session):
    token, user = _login(session, DRIVER_PHONE, "driver")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, user


@pytest.fixture(scope="session")
def driver2_auth(session):
    token, user = _login(session, DRIVER2_PHONE, "driver")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, user


@pytest.fixture(scope="session")
def admin_auth(session):
    token, user = _login(session, ADMIN_PHONE, "admin")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, user


# ---------- health ----------
class TestHealth:
    def test_health(self, session):
        r = session.get(f"{API}/health")
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- Auth (OTP) ----------
class TestAuth:
    def test_send_otp(self, session):
        r = session.post(f"{API}/auth/send-otp", json={"phone": CUSTOMER_PHONE, "role": "customer"})
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert d.get("demo_otp") == "1234"

    def test_verify_customer(self, session):
        r = session.post(f"{API}/auth/verify-otp", json={"phone": CUSTOMER_PHONE, "otp": "1234", "role": "customer"})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20
        assert data["user"]["phone"] == CUSTOMER_PHONE
        assert data["user"]["role"] == "customer"

    def test_verify_admin(self, session):
        r = session.post(f"{API}/auth/verify-otp", json={"phone": ADMIN_PHONE, "otp": "1234", "role": "admin"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"

    def test_verify_otp_invalid_format(self, session):
        r = session.post(f"{API}/auth/verify-otp", json={"phone": CUSTOMER_PHONE, "otp": "12", "role": "customer"})
        assert r.status_code == 400

    def test_admin_no_autocreate(self, session):
        r = session.post(f"{API}/auth/verify-otp", json={"phone": "+918888888888", "otp": "1234", "role": "admin"})
        assert r.status_code == 403

    def test_new_phone_autocreates_customer(self, session):
        r = session.post(f"{API}/auth/verify-otp", json={"phone": NEW_PHONE, "otp": "1234", "role": "customer", "name": "TEST_AutoCreated"})
        assert r.status_code == 200
        user = r.json()["user"]
        assert user["phone"] == NEW_PHONE
        assert user["role"] == "customer"

    def test_auth_me(self, session, customer_auth):
        headers, user = customer_auth
        r = session.get(f"{API}/auth/me", headers=headers)
        assert r.status_code == 200
        assert r.json()["id"] == user["id"]

    def test_auth_me_no_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- Vehicles & Fare ----------
class TestVehiclesFare:
    def test_vehicles_list(self, session):
        r = session.get(f"{API}/vehicles")
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 4
        ids = {v["id"] for v in items}
        assert {"veh-2w-ev", "veh-3w-ev", "veh-mini-ev", "veh-large-ev"} == ids

    def test_fare_estimate(self, session):
        payload = {
            "pickup": {"label": "MG Road", "lat": 12.9756, "lng": 77.6050},
            "drops": [{"label": "Indiranagar", "lat": 12.9784, "lng": 77.6408}],
            "vehicle_id": "veh-3w-ev",
        }
        r = session.post(f"{API}/fare/estimate", json=payload)
        assert r.status_code == 200
        d = r.json()
        for k in ("distance_km", "duration_min", "base_fare", "distance_fare", "time_fare", "total"):
            assert k in d
        assert d["total"] > 0
        assert d["distance_km"] > 0

    def test_fare_invalid_vehicle(self, session):
        r = session.post(f"{API}/fare/estimate", json={
            "pickup": {"label": "A", "lat": 12.97, "lng": 77.60},
            "drops": [{"label": "B", "lat": 12.98, "lng": 77.64}],
            "vehicle_id": "veh-bad",
        })
        assert r.status_code == 404


# ---------- Bookings ----------
class TestBookings:
    booking_id = None

    def test_create_booking_requires_auth(self, session):
        r = session.post(f"{API}/bookings", json={
            "vehicle_id": "veh-3w-ev",
            "pickup": {"label": "A", "lat": 12.97, "lng": 77.60},
            "drops": [{"label": "B", "lat": 12.98, "lng": 77.64}],
        })
        assert r.status_code == 401

    def test_create_booking(self, session, customer_auth):
        headers, _ = customer_auth
        payload = {
            "vehicle_id": "veh-3w-ev",
            "pickup": {"label": "MG Road", "lat": 12.9756, "lng": 77.6050},
            "drops": [{"label": "Indiranagar", "lat": 12.9784, "lng": 77.6408}],
            "payment_method": "upi",
        }
        r = session.post(f"{API}/bookings", json=payload, headers=headers)
        assert r.status_code == 200
        b = r.json()
        assert b["status"] == "accepted"  # auto-assigned
        assert b["driver_id"] is not None
        assert b["vehicle_id"] == "veh-3w-ev"
        TestBookings.booking_id = b["id"]

    def test_my_bookings(self, session, customer_auth):
        headers, _ = customer_auth
        r = session.get(f"{API}/bookings/my", headers=headers)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert any(b["id"] == TestBookings.booking_id for b in items)

    def test_get_booking_with_driver_loc(self, session, customer_auth):
        headers, _ = customer_auth
        r = session.get(f"{API}/bookings/{TestBookings.booking_id}", headers=headers)
        assert r.status_code == 200
        b = r.json()
        assert "driver_lat" in b and "driver_lng" in b
        assert b["driver_lat"] is not None

    def test_status_flow(self, session, customer_auth):
        headers, _ = customer_auth
        bid = TestBookings.booking_id
        for st in ["arriving", "in_transit", "completed"]:
            r = session.patch(f"{API}/bookings/{bid}/status", json={"status": st}, headers=headers)
            assert r.status_code == 200, r.text
        # confirm paid + completed
        r = session.get(f"{API}/bookings/{bid}", headers=headers)
        b = r.json()
        assert b["status"] == "completed"
        assert b["payment_status"] == "paid"


# ---------- Driver ----------
class TestDriver:
    def test_online_toggle(self, session, driver_auth):
        headers, _ = driver_auth
        r = session.post(f"{API}/driver/online", json={"is_online": True}, headers=headers)
        assert r.status_code == 200 and r.json()["is_online"] is True

    def test_available_jobs_filter(self, session, driver_auth):
        headers, drv = driver_auth
        r = session.get(f"{API}/driver/available-jobs", headers=headers)
        assert r.status_code == 200
        items = r.json()
        # all jobs should match driver's vehicle_id and be pending
        for b in items:
            assert b["vehicle_id"] == drv.get("vehicle_id")
            assert b["status"] == "pending"

    def test_earnings_shape(self, session, driver_auth):
        headers, _ = driver_auth
        r = session.get(f"{API}/driver/earnings", headers=headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("today", "week", "month", "trips", "daily"):
            assert k in d
        assert isinstance(d["daily"], list) and len(d["daily"]) == 7

    def test_driver_cannot_access_others_job(self, session, customer_auth, driver2_auth):
        cust_h, _ = customer_auth
        # create a booking matched to veh-3w-ev (driver2's vehicle)
        payload = {
            "vehicle_id": "veh-3w-ev",
            "pickup": {"label": "Pick", "lat": 12.97, "lng": 77.60},
            "drops": [{"label": "Drop", "lat": 12.98, "lng": 77.64}],
        }
        r = session.post(f"{API}/bookings", json=payload, headers=cust_h)
        assert r.status_code == 200
        b = r.json()
        # driver1 (different driver) attempts to access
        # Login driver who is NOT the assigned one
        # Find non-assigned driver
        assigned_driver_id = b["driver_id"]
        # pick driver2 if not assigned else driver1
        d2_h, d2 = driver2_auth
        if d2["id"] == assigned_driver_id:
            # use the other driver
            tok, u = _login(session, DRIVER_PHONE, "driver")
            other_h = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
        else:
            other_h = d2_h
        r2 = session.get(f"{API}/bookings/{b['id']}", headers=other_h)
        assert r2.status_code == 403


# ---------- Admin ----------
class TestAdmin:
    def test_stats(self, session, admin_auth):
        headers, _ = admin_auth
        r = session.get(f"{API}/admin/stats", headers=headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("customers", "drivers", "online_drivers", "bookings", "active_bookings", "completed_bookings", "revenue", "daily_revenue"):
            assert k in d
        assert isinstance(d["daily_revenue"], list) and len(d["daily_revenue"]) == 7
        assert d["drivers"] >= 5

    def test_drivers_list(self, session, admin_auth):
        headers, _ = admin_auth
        r = session.get(f"{API}/admin/drivers", headers=headers)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_customers_list(self, session, admin_auth):
        headers, _ = admin_auth
        r = session.get(f"{API}/admin/customers", headers=headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_bookings_list(self, session, admin_auth):
        headers, _ = admin_auth
        r = session.get(f"{API}/admin/bookings", headers=headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_endpoints_reject_non_admin(self, session, customer_auth):
        headers, _ = customer_auth
        for path in ["/admin/stats", "/admin/drivers", "/admin/customers", "/admin/bookings"]:
            r = session.get(f"{API}{path}", headers=headers)
            assert r.status_code == 403, f"{path} should be 403"


# ---------- Payments (mock Razorpay) ----------
class TestPayments:
    def test_initiate_and_verify(self, session, customer_auth):
        headers, _ = customer_auth
        # create a fresh booking to pay for
        b = session.post(f"{API}/bookings", json={
            "vehicle_id": "veh-2w-ev",
            "pickup": {"label": "P", "lat": 12.97, "lng": 77.60},
            "drops": [{"label": "D", "lat": 12.98, "lng": 77.64}],
            "payment_method": "card",
        }, headers=headers).json()

        r = session.post(f"{API}/payments/initiate", json={"booking_id": b["id"]}, headers=headers)
        assert r.status_code == 200
        d = r.json()
        assert d["order_id"].startswith("order_mock_")
        assert d["key_id"] == "rzp_test_mock_key"

        r = session.post(f"{API}/payments/verify", json={
            "booking_id": b["id"],
            "razorpay_payment_id": "pay_mock_123",
            "razorpay_order_id": d["order_id"],
            "razorpay_signature": "sig_mock",
        }, headers=headers)
        assert r.status_code == 200 and r.json()["ok"] is True

        # confirm paid
        b2 = session.get(f"{API}/bookings/{b['id']}", headers=headers).json()
        assert b2["payment_status"] == "paid"
