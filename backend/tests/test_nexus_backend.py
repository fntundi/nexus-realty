"""Backend API tests for Nexus Realty FastAPI backend.

Covers: health, public-settings, auth (register/login/me + demo fallback),
generic entity CRUD with operators, bulk create, sort/limit/skip, count,
function invoke (calculateLeadScores, checkLoanEligibility, fetchMarketData,
unknown stub), and Postgres persistence across backend restart.
"""
import os
import time
import uuid
import subprocess

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback to reading frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip()
                    break
    except Exception:
        pass
BASE_URL = (BASE_URL or "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------------- health & public ----------------
class TestHealth:
    def test_health_ok(self, s):
        r = s.get(f"{BASE_URL}/api/health", timeout=15)
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}

    def test_public_settings(self, s):
        r = s.get(f"{BASE_URL}/api/apps/public/prod/public-settings/by-id/local", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body.get("id") == "local"
        assert "public_settings" in body
        assert isinstance(body["public_settings"], dict)
        assert body["public_settings"].get("app_name") == "Nexus Realty"


# ---------------- auth ----------------
class TestAuth:
    def test_me_without_token_returns_demo(self, s):
        r = s.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body.get("email") == "demo@nexusrealty.local"
        assert "id" in body
        assert body.get("full_name")

    def test_register_login_me(self, s):
        email = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
        password = "Pass1234!"
        r = s.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": password, "full_name": "Test User"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body and isinstance(body["token"], str)
        assert body["user"]["email"] == email

        # login
        r2 = s.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password},
            timeout=20,
        )
        assert r2.status_code == 200, r2.text
        token = r2.json()["token"]
        assert isinstance(token, str) and len(token) > 10

        # me with token
        r3 = s.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
        assert r3.status_code == 200
        me = r3.json()
        assert me["email"] == email
        assert me["full_name"] == "Test User"

    def test_register_duplicate_returns_400(self, s):
        email = f"TEST_dup_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": "x12345"},
            timeout=15,
        )
        assert r.status_code == 200
        r2 = s.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": "x12345"},
            timeout=15,
        )
        assert r2.status_code == 400

    def test_login_invalid(self, s):
        r = s.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "nobody_xxx@example.com", "password": "nope"},
            timeout=15,
        )
        assert r.status_code == 401


# ---------------- entity CRUD ----------------
class TestEntityCRUD:
    def test_create_get_update_delete_lead(self, s):
        # CREATE
        payload = {
            "first_name": "TEST_Jane",
            "last_name": "Doe",
            "email": "jane_test@example.com",
            "phone": "+15551234567",
            "status": "new",
            "budget": 500000,
            "engagement_count": 5,
        }
        r = s.post(f"{BASE_URL}/api/entities/Lead", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()
        assert "id" in created and isinstance(created["id"], str)
        assert created["first_name"] == "TEST_Jane"
        assert created["created_date"]
        rid = created["id"]

        # GET one
        r2 = s.get(f"{BASE_URL}/api/entities/Lead/{rid}", timeout=15)
        assert r2.status_code == 200
        got = r2.json()
        assert got["id"] == rid
        assert got["email"] == "jane_test@example.com"

        # UPDATE (merge)
        r3 = s.put(
            f"{BASE_URL}/api/entities/Lead/{rid}",
            json={"status": "qualified", "score": 88},
            timeout=15,
        )
        assert r3.status_code == 200
        upd = r3.json()
        assert upd["status"] == "qualified"
        assert upd["score"] == 88
        # merge preserves other fields
        assert upd["first_name"] == "TEST_Jane"

        # GET verify persistence
        r4 = s.get(f"{BASE_URL}/api/entities/Lead/{rid}", timeout=15)
        assert r4.status_code == 200
        assert r4.json()["status"] == "qualified"

        # DELETE
        r5 = s.delete(f"{BASE_URL}/api/entities/Lead/{rid}", timeout=15)
        assert r5.status_code == 200
        assert r5.json().get("success") is True

        # GET 404
        r6 = s.get(f"{BASE_URL}/api/entities/Lead/{rid}", timeout=15)
        assert r6.status_code == 404

    def test_list_with_sort_limit_skip(self, s):
        # Seed a few
        ids = []
        for i in range(3):
            r = s.post(
                f"{BASE_URL}/api/entities/SortTest",
                json={"name": f"TEST_{i}", "rank": i},
                timeout=15,
            )
            assert r.status_code == 200
            ids.append(r.json()["id"])

        r = s.get(
            f"{BASE_URL}/api/entities/SortTest",
            params={"_sort": "-created_date", "_limit": 2, "_skip": 0},
            timeout=15,
        )
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        assert len(rows) <= 2

        # cleanup
        for rid in ids:
            s.delete(f"{BASE_URL}/api/entities/SortTest/{rid}", timeout=15)

    def test_filter_operators_in_gt(self, s):
        # seed
        seeded = []
        for status, budget in [("new", 100000), ("new", 600000), ("qualified", 800000)]:
            r = s.post(
                f"{BASE_URL}/api/entities/FilterLead",
                json={"status": status, "budget": budget, "name": "TEST"},
                timeout=15,
            )
            assert r.status_code == 200
            seeded.append(r.json()["id"])

        # $in
        r = s.post(
            f"{BASE_URL}/api/entities/FilterLead/filter",
            json={"criteria": {"status": {"$in": ["new", "qualified"]}}},
            timeout=15,
        )
        assert r.status_code == 200
        rows = r.json()
        statuses = {row["status"] for row in rows}
        assert {"new", "qualified"}.issubset(statuses)
        assert len(rows) >= 3

        # $gt on numeric jsonb (stored as string compare — verify budget > 500000)
        r2 = s.post(
            f"{BASE_URL}/api/entities/FilterLead/filter",
            json={"criteria": {"budget": {"$gt": 500000}}},
            timeout=15,
        )
        assert r2.status_code == 200
        rows2 = r2.json()
        # Should include the 600k and 800k rows
        budgets = [row.get("budget") for row in rows2]
        assert any(b == 600000 for b in budgets), f"600000 missing; got: {budgets}"
        assert any(b == 800000 for b in budgets), f"800000 missing; got: {budgets}"

        # cleanup
        for rid in seeded:
            s.delete(f"{BASE_URL}/api/entities/FilterLead/{rid}", timeout=15)

    def test_bulk_create(self, s):
        body = [
            {"address": "1 TEST St", "price": 250000},
            {"address": "2 TEST Ave", "price": 450000},
        ]
        r = s.post(f"{BASE_URL}/api/entities/Property/bulk", json=body, timeout=20)
        assert r.status_code == 200, r.text
        out = r.json()
        assert isinstance(out, list) and len(out) == 2
        for row in out:
            assert "id" in row
            assert row["address"].startswith(("1 TEST", "2 TEST"))
        # cleanup
        for row in out:
            s.delete(f"{BASE_URL}/api/entities/Property/{row['id']}", timeout=15)

    def test_count(self, s):
        # baseline
        r0 = s.get(f"{BASE_URL}/api/entities/CountTest/_meta/count", timeout=15)
        assert r0.status_code == 200
        base = r0.json()["count"]
        # add 2
        ids = []
        for i in range(2):
            r = s.post(
                f"{BASE_URL}/api/entities/CountTest",
                json={"i": i, "name": "TEST"},
                timeout=15,
            )
            ids.append(r.json()["id"])
        r1 = s.get(f"{BASE_URL}/api/entities/CountTest/_meta/count", timeout=15)
        assert r1.status_code == 200
        assert r1.json()["count"] == base + 2
        # cleanup
        for rid in ids:
            s.delete(f"{BASE_URL}/api/entities/CountTest/{rid}", timeout=15)


# ---------------- functions ----------------
class TestFunctions:
    def test_calculate_lead_scores(self, s):
        payload = {
            "leads": [
                {"id": "a", "email": "a@x.com", "phone": "555", "budget": 500000,
                 "engagement_count": 5, "pre_approved": True},
                {"id": "b"},
            ]
        }
        r = s.post(f"{BASE_URL}/api/functions/calculateLeadScores", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "data" in body
        scores = body["data"]["scores"]
        assert isinstance(scores, list) and len(scores) == 2
        a = next(x for x in scores if x["id"] == "a")
        b = next(x for x in scores if x["id"] == "b")
        assert a["score"] > b["score"]
        assert 0 <= a["score"] <= 100

    def test_check_loan_eligibility(self, s):
        r = s.post(
            f"{BASE_URL}/api/functions/checkLoanEligibility",
            json={"annual_income": 120000, "monthly_debt": 1500},
            timeout=15,
        )
        assert r.status_code == 200
        body = r.json()
        d = body["data"]
        assert "eligible" in d and isinstance(d["eligible"], bool)
        assert "dti_ratio" in d and isinstance(d["dti_ratio"], (int, float))
        assert d["eligible"] is True
        assert d["dti_ratio"] < 0.43

    def test_fetch_market_data(self, s):
        r = s.post(
            f"{BASE_URL}/api/functions/fetchMarketData",
            json={"market": "Austin"},
            timeout=15,
        )
        assert r.status_code == 200
        d = r.json()["data"]
        assert d["market"] == "Austin"
        for k in ("median_price", "inventory", "days_on_market", "yoy_change_pct"):
            assert k in d

    def test_unknown_function_returns_stub_not_500(self, s):
        r = s.post(
            f"{BASE_URL}/api/functions/notARealFunction_xyz",
            json={"foo": "bar"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("status") == 200
        d = body["data"]
        assert d.get("function") == "notARealFunction_xyz"
        assert d.get("note") == "stub"


# ---------------- persistence across restart ----------------
class TestPersistence:
    def test_data_survives_backend_restart(self, s):
        marker = f"TEST_persist_{uuid.uuid4().hex[:10]}"
        r = s.post(
            f"{BASE_URL}/api/entities/PersistEntity",
            json={"marker": marker, "v": 1},
            timeout=20,
        )
        assert r.status_code == 200
        rid = r.json()["id"]

        # Restart backend
        subprocess.run(
            ["sudo", "supervisorctl", "restart", "backend"],
            check=False,
            capture_output=True,
        )
        # wait for backend health
        deadline = time.time() + 60
        while time.time() < deadline:
            try:
                hr = requests.get(f"{BASE_URL}/api/health", timeout=5)
                if hr.status_code == 200:
                    break
            except Exception:
                pass
            time.sleep(1)
        else:
            pytest.fail("Backend did not come back up after restart")

        # fetch and verify
        r2 = requests.get(f"{BASE_URL}/api/entities/PersistEntity/{rid}", timeout=15)
        assert r2.status_code == 200, r2.text
        assert r2.json()["marker"] == marker
        # cleanup
        requests.delete(f"{BASE_URL}/api/entities/PersistEntity/{rid}", timeout=15)
