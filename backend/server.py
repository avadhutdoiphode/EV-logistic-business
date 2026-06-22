"""
EV Logistics Platform — FastAPI backend
Roles: customer, driver, admin
Auth: phone + OTP (mocked, any 4-digit accepted; demo OTP is 1234)
Payments: mocked Razorpay
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import math
import random
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ.get("JWT_SECRET", "ev-logistics-dev-secret-change-me")
JWT_ALG = "HS256"
JWT_EXP_DAYS = 30

app = FastAPI(title="EV Logistics API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s :: %(message)s")
log = logging.getLogger("ev-logistics")


# ---------- Models ----------
Role = Literal["customer", "driver", "admin"]
BookingStatus = Literal["pending", "accepted", "arriving", "in_transit", "completed", "cancelled"]


class SendOtpReq(BaseModel):
    phone: str
    role: Role


class VerifyOtpReq(BaseModel):
    phone: str
    otp: str
    role: Role
    name: Optional[str] = None


class User(BaseModel):
    id: str
    phone: str
    role: Role
    name: str
    created_at: datetime


class Stop(BaseModel):
    label: str
    lat: float
    lng: float


class Vehicle(BaseModel):
    id: str
    name: str
    capacity_kg: int
    base_fare: float
    per_km: float
    per_min: float
    eta_min: int
    image_key: str
    description: str


class FareEstimateReq(BaseModel):
    pickup: Stop
    drops: List[Stop]
    vehicle_id: str


class FareEstimate(BaseModel):
    vehicle_id: str
    distance_km: float
    duration_min: int
    base_fare: float
    distance_fare: float
    time_fare: float
    total: float


class BookingCreate(BaseModel):
    vehicle_id: str
    pickup: Stop
    drops: List[Stop]
    payment_method: Literal["cash", "upi", "card"] = "cash"


class Booking(BaseModel):
    id: str
    customer_id: str
    customer_name: str
    customer_phone: str
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    vehicle_id: str
    vehicle_name: str
    pickup: Stop
    drops: List[Stop]
    distance_km: float
    duration_min: int
    fare: float
    status: BookingStatus
    payment_method: str
    payment_status: Literal["pending", "paid"] = "pending"
    created_at: datetime
    updated_at: datetime


class StatusUpdate(BaseModel):
    status: BookingStatus


class OnlineToggle(BaseModel):
    is_online: bool


class LocationPing(BaseModel):
    lat: float
    lng: float


class PaymentInit(BaseModel):
    booking_id: str


class PaymentVerify(BaseModel):
    booking_id: str
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


# ---------- Helpers ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def make_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": now_utc() + timedelta(days=JWT_EXP_DAYS),
        "iat": now_utc(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def parse_token(authorization: Optional[str]) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError as e:
        raise HTTPException(401, f"Invalid token: {e}")


async def current_user(authorization: Optional[str] = Header(None)) -> dict:
    payload = parse_token(authorization)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


def require_role(*roles: str):
    async def dep(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(403, f"Requires role: {roles}")
        return user
    return dep


def haversine_km(a: Stop, b: Stop) -> float:
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, [a.lat, a.lng, b.lat, b.lng])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def total_route_km(pickup: Stop, drops: List[Stop]) -> float:
    pts = [pickup, *drops]
    return sum(haversine_km(pts[i], pts[i + 1]) for i in range(len(pts) - 1))


def clean(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc = {k: v for k, v in doc.items() if k != "_id"}
    return doc


# ---------- Seed ----------
SEED_VEHICLES = [
    {
        "id": "veh-2w-ev",
        "name": "EV Scooter",
        "capacity_kg": 20,
        "base_fare": 25.0,
        "per_km": 8.0,
        "per_min": 1.0,
        "eta_min": 4,
        "image_key": "scooter",
        "description": "For small parcels & documents",
    },
    {
        "id": "veh-3w-ev",
        "name": "EV Auto Cargo",
        "capacity_kg": 250,
        "base_fare": 55.0,
        "per_km": 14.0,
        "per_min": 2.0,
        "eta_min": 7,
        "image_key": "auto",
        "description": "Mid-sized loads & furniture",
    },
    {
        "id": "veh-mini-ev",
        "name": "EV Mini Truck",
        "capacity_kg": 750,
        "base_fare": 120.0,
        "per_km": 22.0,
        "per_min": 3.0,
        "eta_min": 11,
        "image_key": "van",
        "description": "House shifting & bulk goods",
    },
    {
        "id": "veh-large-ev",
        "name": "EV Tata Ace",
        "capacity_kg": 1500,
        "base_fare": 200.0,
        "per_km": 30.0,
        "per_min": 4.0,
        "eta_min": 14,
        "image_key": "truck",
        "description": "Large commercial cargo",
    },
]

SEED_DRIVERS = [
    {"phone": "+912222222222", "name": "Ravi Kumar", "vehicle_id": "veh-2w-ev", "rating": 4.8, "vehicle_number": "KA01EV1234"},
    {"phone": "+912222222223", "name": "Suresh Patel", "vehicle_id": "veh-3w-ev", "rating": 4.6, "vehicle_number": "KA02EV4571"},
    {"phone": "+912222222224", "name": "Anil Sharma", "vehicle_id": "veh-mini-ev", "rating": 4.9, "vehicle_number": "KA03EV9032"},
    {"phone": "+912222222225", "name": "Manish Verma", "vehicle_id": "veh-large-ev", "rating": 4.7, "vehicle_number": "KA04EV1180"},
    {"phone": "+912222222226", "name": "Deepak Singh", "vehicle_id": "veh-3w-ev", "rating": 4.5, "vehicle_number": "KA05EV6612"},
]


async def seed_data():
    # vehicles
    if await db.vehicles.count_documents({}) == 0:
        await db.vehicles.insert_many([v.copy() for v in SEED_VEHICLES])
        log.info("Seeded %d vehicles", len(SEED_VEHICLES))

    # admin
    if not await db.users.find_one({"phone": "+919999999999"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "phone": "+919999999999",
            "role": "admin",
            "name": "Platform Admin",
            "created_at": now_utc().isoformat(),
        })
        log.info("Seeded admin user (+919999999999)")

    # demo customer
    if not await db.users.find_one({"phone": "+911111111111"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "phone": "+911111111111",
            "role": "customer",
            "name": "Demo Customer",
            "created_at": now_utc().isoformat(),
        })
        log.info("Seeded demo customer (+911111111111)")

    # drivers
    for d in SEED_DRIVERS:
        if not await db.users.find_one({"phone": d["phone"]}):
            uid = str(uuid.uuid4())
            await db.users.insert_one({
                "id": uid,
                "phone": d["phone"],
                "role": "driver",
                "name": d["name"],
                "vehicle_id": d["vehicle_id"],
                "vehicle_number": d["vehicle_number"],
                "rating": d["rating"],
                "is_online": True,
                "current_lat": 12.9716 + random.uniform(-0.05, 0.05),
                "current_lng": 77.5946 + random.uniform(-0.05, 0.05),
                "created_at": now_utc().isoformat(),
            })
    log.info("Drivers ensured (%d)", len(SEED_DRIVERS))

    # demo bookings
    if await db.bookings.count_documents({}) == 0:
        cust = await db.users.find_one({"phone": "+911111111111"}, {"_id": 0})
        drivers = await db.users.find({"role": "driver"}, {"_id": 0}).to_list(10)
        veh = await db.vehicles.find_one({"id": "veh-3w-ev"}, {"_id": 0})
        statuses = ["completed", "completed", "in_transit"]
        for i, st in enumerate(statuses):
            drv = drivers[i % len(drivers)]
            await db.bookings.insert_one({
                "id": str(uuid.uuid4()),
                "customer_id": cust["id"],
                "customer_name": cust["name"],
                "customer_phone": cust["phone"],
                "driver_id": drv["id"],
                "driver_name": drv["name"],
                "driver_phone": drv["phone"],
                "vehicle_id": veh["id"],
                "vehicle_name": veh["name"],
                "pickup": {"label": "MG Road, Bengaluru", "lat": 12.9756, "lng": 77.6050},
                "drops": [{"label": "Indiranagar, Bengaluru", "lat": 12.9784, "lng": 77.6408}],
                "distance_km": 5.2 + i,
                "duration_min": 18 + i * 3,
                "fare": 180.0 + i * 40,
                "status": st,
                "payment_method": "upi",
                "payment_status": "paid" if st == "completed" else "pending",
                "created_at": (now_utc() - timedelta(days=i + 1)).isoformat(),
                "updated_at": now_utc().isoformat(),
            })
        log.info("Seeded demo bookings")


# ---------- Auth ----------
@api.post("/auth/send-otp")
async def send_otp(req: SendOtpReq):
    # MOCK: in real impl, send via Firebase. We just acknowledge.
    log.info("OTP requested for %s as %s (demo OTP: 1234)", req.phone, req.role)
    return {"ok": True, "message": "OTP sent (demo: use 1234 or any 4 digits)", "demo_otp": "1234"}


@api.post("/auth/verify-otp")
async def verify_otp(req: VerifyOtpReq):
    if not req.otp or len(req.otp) != 4 or not req.otp.isdigit():
        raise HTTPException(400, "OTP must be 4 digits")
    # MOCK: accept any 4-digit OTP

    user = await db.users.find_one({"phone": req.phone, "role": req.role}, {"_id": 0})
    if not user:
        # auto-create customer or driver; never auto-create admin
        if req.role == "admin":
            raise HTTPException(403, "Admin account does not exist")
        new_user = {
            "id": str(uuid.uuid4()),
            "phone": req.phone,
            "role": req.role,
            "name": req.name or ("New Customer" if req.role == "customer" else "New Driver"),
            "created_at": now_utc().isoformat(),
        }
        if req.role == "driver":
            new_user.update({
                "vehicle_id": "veh-3w-ev",
                "vehicle_number": "PENDING",
                "rating": 5.0,
                "is_online": False,
                "current_lat": 12.9716,
                "current_lng": 77.5946,
            })
        await db.users.insert_one(new_user)
        user = {k: v for k, v in new_user.items()}

    token = make_token(user["id"], user["role"])
    return {"token": token, "user": clean(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return clean(user)


# ---------- Vehicles & Fare ----------
@api.get("/vehicles")
async def list_vehicles():
    items = await db.vehicles.find({}, {"_id": 0}).to_list(50)
    return items


@api.post("/fare/estimate", response_model=FareEstimate)
async def fare_estimate(req: FareEstimateReq):
    veh = await db.vehicles.find_one({"id": req.vehicle_id}, {"_id": 0})
    if not veh:
        raise HTTPException(404, "Vehicle not found")
    dist = max(0.5, total_route_km(req.pickup, req.drops))
    duration = max(5, int(dist * 3))  # rough: 20km/h average urban
    distance_fare = round(dist * veh["per_km"], 2)
    time_fare = round(duration * veh["per_min"], 2)
    total = round(veh["base_fare"] + distance_fare + time_fare, 2)
    return FareEstimate(
        vehicle_id=veh["id"],
        distance_km=round(dist, 2),
        duration_min=duration,
        base_fare=veh["base_fare"],
        distance_fare=distance_fare,
        time_fare=time_fare,
        total=total,
    )


# ---------- Bookings ----------
@api.post("/bookings")
async def create_booking(payload: BookingCreate, user: dict = Depends(require_role("customer"))):
    veh = await db.vehicles.find_one({"id": payload.vehicle_id}, {"_id": 0})
    if not veh:
        raise HTTPException(404, "Vehicle not found")
    dist = max(0.5, total_route_km(payload.pickup, payload.drops))
    duration = max(5, int(dist * 3))
    fare = round(veh["base_fare"] + dist * veh["per_km"] + duration * veh["per_min"], 2)

    # auto-assign a random online driver matching vehicle (mock dispatcher)
    drv = await db.users.find_one(
        {"role": "driver", "vehicle_id": veh["id"], "is_online": True},
        {"_id": 0},
    )
    if not drv:
        drv = await db.users.find_one({"role": "driver", "vehicle_id": veh["id"]}, {"_id": 0})

    booking = {
        "id": str(uuid.uuid4()),
        "customer_id": user["id"],
        "customer_name": user["name"],
        "customer_phone": user["phone"],
        "driver_id": drv["id"] if drv else None,
        "driver_name": drv["name"] if drv else None,
        "driver_phone": drv["phone"] if drv else None,
        "vehicle_id": veh["id"],
        "vehicle_name": veh["name"],
        "pickup": payload.pickup.dict(),
        "drops": [d.dict() for d in payload.drops],
        "distance_km": round(dist, 2),
        "duration_min": duration,
        "fare": fare,
        "status": "accepted" if drv else "pending",
        "payment_method": payload.payment_method,
        "payment_status": "pending",
        "created_at": now_utc().isoformat(),
        "updated_at": now_utc().isoformat(),
    }
    await db.bookings.insert_one(booking.copy())
    return clean(booking)


@api.get("/bookings/my")
async def my_bookings(user: dict = Depends(current_user)):
    if user["role"] == "customer":
        q = {"customer_id": user["id"]}
    elif user["role"] == "driver":
        q = {"driver_id": user["id"]}
    else:
        q = {}
    items = await db.bookings.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@api.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, user: dict = Depends(current_user)):
    b = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking not found")
    if user["role"] == "customer" and b["customer_id"] != user["id"]:
        raise HTTPException(403, "Not your booking")
    if user["role"] == "driver" and b.get("driver_id") != user["id"]:
        raise HTTPException(403, "Not your job")
    # attach live driver pos for tracking
    if b.get("driver_id"):
        drv = await db.users.find_one({"id": b["driver_id"]}, {"_id": 0})
        if drv:
            b["driver_lat"] = drv.get("current_lat")
            b["driver_lng"] = drv.get("current_lng")
            b["driver_rating"] = drv.get("rating")
            b["driver_vehicle_number"] = drv.get("vehicle_number")
    return b


@api.patch("/bookings/{booking_id}/status")
async def update_status(booking_id: str, payload: StatusUpdate, user: dict = Depends(current_user)):
    b = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking not found")
    if user["role"] == "driver" and b.get("driver_id") != user["id"]:
        raise HTTPException(403, "Not your job")
    if user["role"] == "customer" and b["customer_id"] != user["id"]:
        raise HTTPException(403, "Not your booking")
    update = {"status": payload.status, "updated_at": now_utc().isoformat()}
    if payload.status == "completed":
        update["payment_status"] = "paid"
    await db.bookings.update_one({"id": booking_id}, {"$set": update})
    return {"ok": True, "status": payload.status}


# ---------- Driver ----------
@api.post("/driver/online")
async def toggle_online(payload: OnlineToggle, user: dict = Depends(require_role("driver"))):
    await db.users.update_one({"id": user["id"]}, {"$set": {"is_online": payload.is_online}})
    return {"is_online": payload.is_online}


@api.post("/driver/location")
async def driver_location(payload: LocationPing, user: dict = Depends(require_role("driver"))):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"current_lat": payload.lat, "current_lng": payload.lng}},
    )
    return {"ok": True}


@api.get("/driver/available-jobs")
async def available_jobs(user: dict = Depends(require_role("driver"))):
    items = await db.bookings.find(
        {"status": "pending", "vehicle_id": user.get("vehicle_id")}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return items


@api.post("/driver/accept/{booking_id}")
async def accept_job(booking_id: str, user: dict = Depends(require_role("driver"))):
    b = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Not found")
    if b["status"] != "pending":
        raise HTTPException(400, "Already taken")
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "driver_id": user["id"],
            "driver_name": user["name"],
            "driver_phone": user["phone"],
            "status": "accepted",
            "updated_at": now_utc().isoformat(),
        }},
    )
    return {"ok": True}


@api.get("/driver/earnings")
async def earnings(user: dict = Depends(require_role("driver"))):
    completed = await db.bookings.find(
        {"driver_id": user["id"], "status": "completed"}, {"_id": 0}
    ).to_list(500)
    today = now_utc().date()
    week_start = today - timedelta(days=today.weekday())
    daily = [0.0] * 7
    week_total = 0.0
    today_total = 0.0
    month_total = 0.0
    for b in completed:
        d = datetime.fromisoformat(b["created_at"]).date()
        if d == today:
            today_total += b["fare"]
        if d >= week_start:
            week_total += b["fare"]
            daily[d.weekday()] += b["fare"]
        if d.month == today.month and d.year == today.year:
            month_total += b["fare"]
    return {
        "today": round(today_total, 2),
        "week": round(week_total, 2),
        "month": round(month_total, 2),
        "trips": len(completed),
        "daily": [round(x, 2) for x in daily],
    }


# ---------- Admin ----------
@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    total_users = await db.users.count_documents({"role": "customer"})
    total_drivers = await db.users.count_documents({"role": "driver"})
    online_drivers = await db.users.count_documents({"role": "driver", "is_online": True})
    total_bookings = await db.bookings.count_documents({})
    active = await db.bookings.count_documents({"status": {"$in": ["pending", "accepted", "arriving", "in_transit"]}})
    completed = await db.bookings.count_documents({"status": "completed"})
    revenue_docs = await db.bookings.find({"status": "completed"}, {"_id": 0, "fare": 1, "created_at": 1}).to_list(2000)
    total_revenue = round(sum(b["fare"] for b in revenue_docs), 2)
    # last 7 days revenue
    today = now_utc().date()
    daily_rev = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        amt = sum(b["fare"] for b in revenue_docs if datetime.fromisoformat(b["created_at"]).date() == day)
        daily_rev.append({"date": day.isoformat(), "amount": round(amt, 2)})
    return {
        "customers": total_users,
        "drivers": total_drivers,
        "online_drivers": online_drivers,
        "bookings": total_bookings,
        "active_bookings": active,
        "completed_bookings": completed,
        "revenue": total_revenue,
        "daily_revenue": daily_rev,
    }


@api.get("/admin/drivers")
async def admin_drivers(user: dict = Depends(require_role("admin"))):
    items = await db.users.find({"role": "driver"}, {"_id": 0}).to_list(500)
    return items


@api.get("/admin/customers")
async def admin_customers(user: dict = Depends(require_role("admin"))):
    items = await db.users.find({"role": "customer"}, {"_id": 0}).to_list(500)
    return items


@api.get("/admin/bookings")
async def admin_bookings(user: dict = Depends(require_role("admin"))):
    items = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


# ---------- Payments (mock Razorpay) ----------
@api.post("/payments/initiate")
async def payment_init(payload: PaymentInit, user: dict = Depends(current_user)):
    b = await db.bookings.find_one({"id": payload.booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking not found")
    order_id = "order_mock_" + uuid.uuid4().hex[:14]
    return {
        "order_id": order_id,
        "amount": int(b["fare"] * 100),
        "currency": "INR",
        "key_id": "rzp_test_mock_key",
        "mocked": True,
    }


@api.post("/payments/verify")
async def payment_verify(payload: PaymentVerify, user: dict = Depends(current_user)):
    # MOCK: trust the payload, mark booking paid
    await db.bookings.update_one(
        {"id": payload.booking_id},
        {"$set": {"payment_status": "paid", "updated_at": now_utc().isoformat()}},
    )
    return {"ok": True}


# ---------- Root ----------
@api.get("/")
async def root():
    return {"service": "EV Logistics API", "status": "ok"}


@api.get("/health")
async def health():
    return {"ok": True, "time": now_utc().isoformat()}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_start():
    await seed_data()


@app.on_event("shutdown")
async def on_stop():
    client.close()
