"""Backend API tests for Nexus Realty FastAPI backend.

Covers: health, public-settings, auth (register/login/me + demo fallback),
generic entity CRUD with operators, bulk create, sort/limit/skip, count,
function invoke (calculateLeadScores, checkLoanEligibility, fetchMarketData,
unknown stub), and Postgres persistence across backend restart.
"""
from __future__ import annotations

import os
import subprocess
import time
import uuid
from typing import Dict, List

import pytest
import requests


def _resolve_base_url() -> str:
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        try:
            with open("/app/frontend/.env") as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip()
                        break
        except OSError:
            pass
    return (url or "").rstrip("/")


BASE_URL: str = _resolve_base_url()
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

# Test password sourced from env (with a clearly-non-production fallback) so it
# never lives as a literal in source control. Override with:
#   export NEXUS_TEST_PASSWORD='your-secret'
TEST_PASSWORD: str = os.environ.get("NEXUS_TEST_PASSWORD", "ci-only-" + uuid.uuid4().hex[:10])


@pytest.fixture(scope="session")
def s() -> requests.Session:
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture
def lead_payload() -> Dict[str, object]:
    return {
        "first_name": "TEST_Jane",
        "last_name": "Doe",
        "email": "jane_test@example.com",
        "phone": "+15551234567",
        "status": "new",
        "budget": 500000,
        "engagement_count": 5,
    }


def _create_lead(sess: requests.Session, payload: Dict[str, object]) -> Dict[str, object]:
    r = sess.post(f"{BASE_URL}/api/entities/Lead", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


# ---------------- health & public ----------------
class TestHealth:
    def test_health_ok(self, s: requests.Session) -> None:
        r = s.get(f"{BASE_URL}/api/health", timeout=15)
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}

    def test_public_settings(self, s: requests.Session) -> None:
        r = s.get(f"{BASE_URL}/api/apps/public/prod/public-settings/by-id/local", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body.get("id") == "local"
        assert "public_settings" in body
        assert isinstance(body["public_settings"], dict)
        assert body["public_settings"].get("app_name") == "Nexus Realty"


# ---------------- auth ----------------
class TestAuth:
    def test_me_without_token_returns_demo(self, s: requests.Session) -> None:
        r = s.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body.get("email") == "demo@nexusrealty.local"
        assert "id" in body
        assert body.get("full_name")

    def test_register_login_me(self, s: requests.Session) -> None:
        email = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": TEST_PASSWORD, "full_name": "Test User"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body and isinstance(body["token"], str)
        assert body["user"]["email"] == email

        r2 = s.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": TEST_PASSWORD},
            timeout=20,
        )
        assert r2.status_code == 200, r2.text
        token = r2.json()["token"]
        assert isinstance(token, str) and len(token) > 10

        r3 = s.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
        assert r3.status_code == 200
        me = r3.json()
        assert me["email"] == email
        assert me["full_name"] == "Test User"

    def test_register_duplicate_returns_400(self, s: requests.Session) -> None:
        email = f"TEST_dup_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": TEST_PASSWORD},
            timeout=15,
        )
        assert r.status_code == 200
        r2 = s.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": TEST_PASSWORD},
            timeout=15,
        )
        assert r2.status_code == 400

    def test_login_invalid(self, s: requests.Session) -> None:
        r = s.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "nobody_xxx@example.com", "password": "nope"},
            timeout=15,
        )
        assert r.status_code == 401


# ---------------- entity CRUD (split into focused tests) ----------------
class TestEntityCRUD:
    def test_create_lead(self, s: requests.Session, lead_payload: Dict[str, object]) -> None:
        created = _create_lead(s, lead_payload)
        assert "id" in created and isinstance(created["id"], str)
        assert created["first_name"] == "TEST_Jane"
        assert created["created_date"]
        # cleanup
        s.delete(f"{BASE_URL}/api/entities/Lead/{created['id']}", timeout=15)

    def test_get_lead(self, s: requests.Session, lead_payload: Dict[str, object]) -> None:
        rid = _create_lead(s, lead_payload)["id"]
        try:
            r = s.get(f"{BASE_URL}/api/entities/Lead/{rid}", timeout=15)
            assert r.status_code == 200
            got = r.json()
            assert got["id"] == rid
            assert got["email"] == "jane_test@example.com"
        finally:
            s.delete(f"{BASE_URL}/api/entities/Lead/{rid}", timeout=15)

    def test_update_lead_merges(self, s: requests.Session, lead_payload: Dict[str, object]) -> None:
        rid = _create_lead(s, lead_payload)["id"]
        try:
            r = s.put(
                f"{BASE_URL}/api/entities/Lead/{rid}",
                json={"status": "qualified", "score": 88},
                timeout=15,
            )
            assert r.status_code == 200
            upd = r.json()
            assert upd["status"] == "qualified"
            assert upd["score"] == 88
            assert upd["first_name"] == "TEST_Jane"  # merge preserves other fields

            # persistence
            r2 = s.get(f"{BASE_URL}/api/entities/Lead/{rid}", timeout=15)
            assert r2.status_code == 200
            assert r2.json()["status"] == "qualified"
        finally:
            s.delete(f"{BASE_URL}/api/entities/Lead/{rid}", timeout=15)

    def test_delete_lead(self, s: requests.Session, lead_payload: Dict[str, object]) -> None:
        rid = _create_lead(s, lead_payload)["id"]
        r = s.delete(f"{BASE_URL}/api/entities/Lead/{rid}", timeout=15)
        assert r.status_code == 200
        assert r.json().get("success") == True  # noqa: E712 - prefer == for review compliance
        # 404 afterwards
        r2 = s.get(f"{BASE_URL}/api/entities/Lead/{rid}", timeout=15)
        assert r2.status_code == 404

    def test_list_with_sort_limit_skip(self, s: requests.Session) -> None:
        ids: List[str] = []
        for i in range(3):
            r = s.post(
                f"{BASE_URL}/api/entities/SortTest",
                json={"name": f"TEST_{i}", "rank": i},
                timeout=15,
            )
            assert r.status_code == 200
            ids.append(r.json()["id"])
        try:
            r = s.get(
                f"{BASE_URL}/api/entities/SortTest",
                params={"_sort": "-created_date", "_limit": 2, "_skip": 0},
                timeout=15,
            )
            assert r.status_code == 200
            rows = r.json()
            assert isinstance(rows, list)
            assert len(rows) <= 2
        finally:
            for rid in ids:
                s.delete(f"{BASE_URL}/api/entities/SortTest/{rid}", timeout=15)

    def test_filter_operators_in_gt(self, s: requests.Session) -> None:
        seeded: List[str] = []
        for status, budget in [("new", 100000), ("new", 600000), ("qualified", 800000)]:
            r = s.post(
                f"{BASE_URL}/api/entities/FilterLead",
                json={"status": status, "budget": budget, "name": "TEST"},
                timeout=15,
            )
            assert r.status_code == 200
            seeded.append(r.json()["id"])
        try:
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

            r2 = s.post(
                f"{BASE_URL}/api/entities/FilterLead/filter",
                json={"criteria": {"budget": {"$gt": 500000}}},
                timeout=15,
            )
            assert r2.status_code == 200
            budgets = [row.get("budget") for row in r2.json()]
            assert any(b == 600000 for b in budgets), f"600000 missing; got: {budgets}"
            assert any(b == 800000 for b in budgets), f"800000 missing; got: {budgets}"
        finally:
            for rid in seeded:
                s.delete(f"{BASE_URL}/api/entities/FilterLead/{rid}", timeout=15)

    def test_bulk_create(self, s: requests.Session) -> None:
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
        for row in out:
            s.delete(f"{BASE_URL}/api/entities/Property/{row['id']}", timeout=15)

    def test_count(self, s: requests.Session) -> None:
        r0 = s.get(f"{BASE_URL}/api/entities/CountTest/_meta/count", timeout=15)
        assert r0.status_code == 200
        base = r0.json()["count"]
        ids: List[str] = []
        try:
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
        finally:
            for rid in ids:
                s.delete(f"{BASE_URL}/api/entities/CountTest/{rid}", timeout=15)


# ---------------- functions ----------------
class TestFunctions:
    def test_calculate_lead_scores(self, s: requests.Session) -> None:
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

    def test_check_loan_eligibility(self, s: requests.Session) -> None:
        r = s.post(
            f"{BASE_URL}/api/functions/checkLoanEligibility",
            json={"annual_income": 120000, "monthly_debt": 1500},
            timeout=15,
        )
        assert r.status_code == 200
        d = r.json()["data"]
        assert "eligible" in d and isinstance(d["eligible"], bool)
        assert "dti_ratio" in d and isinstance(d["dti_ratio"], (int, float))
        assert d["eligible"] == True  # noqa: E712 - prefer == for review compliance
        assert d["dti_ratio"] < 0.43

    def test_fetch_market_data(self, s: requests.Session) -> None:
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

    def test_unknown_function_returns_stub_not_500(self, s: requests.Session) -> None:
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
    def test_data_survives_backend_restart(self, s: requests.Session) -> None:
        marker = f"TEST_persist_{uuid.uuid4().hex[:10]}"
        r = s.post(
            f"{BASE_URL}/api/entities/PersistEntity",
            json={"marker": marker, "v": 1},
            timeout=20,
        )
        assert r.status_code == 200
        rid = r.json()["id"]

        subprocess.run(
            ["sudo", "supervisorctl", "restart", "backend"],
            check=False,
            capture_output=True,
        )
        deadline = time.time() + 60
        while time.time() < deadline:
            try:
                hr = requests.get(f"{BASE_URL}/api/health", timeout=5)
                if hr.status_code == 200:
                    break
            except requests.RequestException:
                pass
            time.sleep(1)
        else:
            pytest.fail("Backend did not come back up after restart")

        r2 = requests.get(f"{BASE_URL}/api/entities/PersistEntity/{rid}", timeout=15)
        assert r2.status_code == 200, r2.text
        assert r2.json()["marker"] == marker
        requests.delete(f"{BASE_URL}/api/entities/PersistEntity/{rid}", timeout=15)
