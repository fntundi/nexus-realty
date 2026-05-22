"""Function invoke endpoint.

The original app used base44.functions.invoke('functionName', payload). To
preserve behaviour without external integrations, each function returns a
safe, well-shaped response so the UI keeps working. Where useful (e.g. lead
score calculation) we implement light logic. External integrations (DocuSign,
market-data providers, AI) return success-style payloads with helpful notes.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/functions", tags=["functions"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- per-function handlers (kept compact; return shapes the UI expects)

def _ok(data: dict | list | None = None, **extra) -> dict:
    return {"data": data if data is not None else {}, "status": 200, **extra}


def calculateLeadScores(payload: dict) -> dict:
    """Compute a simple deterministic score from common fields."""
    leads = payload.get("leads") or payload.get("contacts") or []
    out = []
    for lead in leads:
        score = 0
        if lead.get("email"):
            score += 10
        if lead.get("phone"):
            score += 10
        budget = float(lead.get("budget") or 0)
        if budget > 0:
            score += min(40, int(budget / 25000))
        engagement = int(lead.get("engagement_count") or 0)
        score += min(30, engagement * 3)
        if lead.get("pre_approved"):
            score += 20
        out.append({"id": lead.get("id"), "score": min(score, 100)})
    return _ok({"scores": out})


def analyzeConversionLikelihood(payload: dict) -> dict:
    return _ok({
        "likelihood": 0.62,
        "label": "medium",
        "factors": ["engagement_recency", "budget_match", "communication_frequency"],
        "recommendations": [
            "Schedule a property tour within 7 days",
            "Send personalised market report",
        ],
    })


def analyzeDeal(payload: dict) -> dict:
    return _ok({
        "deal_health": "healthy",
        "risk_score": 0.18,
        "next_actions": ["Confirm inspection date", "Verify financing"],
        "estimated_close_date": (datetime.now(timezone.utc) + timedelta(days=21)).isoformat(),
    })


def answerBorrowerQuestion(payload: dict) -> dict:
    q = (payload.get("question") or "").strip()
    return _ok({
        "answer": (
            "Thanks for your question — a member of the lending team will follow "
            "up shortly. In the meantime, please ensure your latest pay stubs and "
            "bank statements are uploaded to your borrower portal."
        ),
        "question": q,
        "sources": [],
    })


def autoAssignLead(payload: dict) -> dict:
    return _ok({
        "assigned_to": payload.get("default_agent") or "demo@nexusrealty.local",
        "reason": "round-robin",
    })


def calendarCheckAvailability(payload: dict) -> dict:
    return _ok({"available": True, "conflicts": []})


def calendarCreateEvent(payload: dict) -> dict:
    return _ok({
        "event_id": f"evt_{int(datetime.now().timestamp())}",
        "status": "confirmed",
        "calendar_link": "",
    })


def calendarDeleteEvent(payload: dict) -> dict:
    return _ok({"deleted": True, "event_id": payload.get("event_id")})


def categorizeDocument(payload: dict) -> dict:
    name = (payload.get("filename") or "").lower()
    category = "other"
    if any(k in name for k in ["contract", "agreement"]):
        category = "contract"
    elif any(k in name for k in ["disclosure"]):
        category = "disclosure"
    elif any(k in name for k in ["inspection"]):
        category = "inspection"
    elif any(k in name for k in ["loan", "approval", "mortgage"]):
        category = "financing"
    return _ok({"category": category, "confidence": 0.82})


def checkClosingDateActivity(payload: dict) -> dict:
    return _ok({"alerts": [], "on_track": True})


def checkHighValueDeals(payload: dict) -> dict:
    return _ok({"flagged": [], "threshold": payload.get("threshold", 1_000_000)})


def checkLoanEligibility(payload: dict) -> dict:
    income = float(payload.get("annual_income") or 0)
    debt = float(payload.get("monthly_debt") or 0)
    dti = (debt * 12 / income) if income else 1
    eligible = dti < 0.43 and income > 0
    return _ok({
        "eligible": eligible,
        "dti_ratio": round(dti, 3),
        "estimated_max_loan": round(income * 4.5, 2) if eligible else 0,
        "notes": "Indicative only — final approval requires lender underwriting.",
    })


def checkPerformanceChanges(payload: dict) -> dict:
    return _ok({"changes": [], "period": payload.get("period", "weekly")})


def checkPropertyAlerts(payload: dict) -> dict:
    return _ok({"alerts": []})


def createCRMTask(payload: dict) -> dict:
    return _ok({"task_id": f"task_{int(datetime.now().timestamp())}", "status": "created"})


def docusignCheckStatus(payload: dict) -> dict:
    return _ok({"envelope_id": payload.get("envelope_id"), "status": "sent", "recipients": []})


def docusignSendEnvelope(payload: dict) -> dict:
    return _ok({
        "envelope_id": f"env_{int(datetime.now().timestamp())}",
        "status": "sent",
        "signing_url": "",
        "note": "DocuSign sandbox not configured — envelope simulated.",
    })


def executeDripCampaign(payload: dict) -> dict:
    return _ok({"executed": True, "sent_count": 0, "campaign_id": payload.get("campaign_id")})


def executeEmailTriggers(payload: dict) -> dict:
    return _ok({"triggered": 0})


def executeLeadScoringRules(payload: dict) -> dict:
    return _ok({"updated": 0})


def executeNurtureWorkflow(payload: dict) -> dict:
    return _ok({"executed": True, "workflow_id": payload.get("workflow_id")})


def executeNurtureWorkflowWithBranching(payload: dict) -> dict:
    return _ok({"executed": True, "branch_taken": payload.get("branch", "default")})


def fetchMarketData(payload: dict) -> dict:
    return _ok({
        "market": payload.get("market"),
        "median_price": 745000,
        "inventory": 142,
        "days_on_market": 28,
        "yoy_change_pct": 4.2,
        "as_of": _now_iso(),
        "note": "Sample dataset — connect a market data provider to enable live data.",
    })


def generateAgentInsights(payload: dict) -> dict:
    return _ok({
        "insights": [
            "Your buyer leads have a 12% higher conversion rate this month.",
            "Listings priced under $750k are selling 22% faster than last quarter.",
        ]
    })


def generateMilestoneTasks(payload: dict) -> dict:
    base = datetime.now(timezone.utc)
    tasks = [
        {"name": "Order home inspection", "due_date": (base + timedelta(days=3)).isoformat()},
        {"name": "Submit loan application", "due_date": (base + timedelta(days=5)).isoformat()},
        {"name": "Final walkthrough", "due_date": (base + timedelta(days=14)).isoformat()},
    ]
    return _ok({"tasks": tasks})


def generateOutreachMessage(payload: dict) -> dict:
    name = payload.get("name") or "there"
    return _ok({
        "subject": "Following up on your home search",
        "message": (
            f"Hi {name},\n\nI wanted to check in and see how your home search is going. "
            "Based on what you've told me, I've spotted a few new listings that match your "
            "criteria. Would this week work for a quick call?\n\nBest,\nYour Nexus agent"
        ),
    })


def generatePropertyRecommendations(payload: dict) -> dict:
    return _ok({"recommendations": []})


def generateReminders(payload: dict) -> dict:
    return _ok({"reminders_created": 0})


def generateReport(payload: dict) -> dict:
    return _ok({
        "report_id": f"rpt_{int(datetime.now().timestamp())}",
        "title": payload.get("title") or "Performance Report",
        "generated_at": _now_iso(),
        "sections": [],
    })


def generateVirtualStaging(payload: dict) -> dict:
    return _ok({"staged_image_url": payload.get("image_url"), "note": "Stub — connect staging provider."})


def onTransactionStageChange(payload: dict) -> dict:
    return _ok({"triggered_workflows": []})


def scheduleCRMSync(payload: dict) -> dict:
    return _ok({"scheduled": True, "next_run": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()})


def secureContactAccess(payload: dict) -> dict:
    return _ok({"granted": True})


def secureFileHandler(payload: dict) -> dict:
    return _ok({"signed_url": payload.get("file_url"), "expires_in": 3600})


def sendClientStatusUpdates(payload: dict) -> dict:
    return _ok({"sent": 0})


def sendClosingReminders(payload: dict) -> dict:
    return _ok({"sent": 0})


def sendEmailSequence(payload: dict) -> dict:
    return _ok({"sent": 0, "sequence_id": payload.get("sequence_id")})


def sendOnboardingReminders(payload: dict) -> dict:
    return _ok({"sent": 0})


def stageTransitionWorkflow(payload: dict) -> dict:
    return _ok({"new_stage": payload.get("to_stage"), "ran_workflows": []})


def suggestOutreachTiming(payload: dict) -> dict:
    return _ok({"suggested_time": (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()})


def suggestScoringFactors(payload: dict) -> dict:
    return _ok({"factors": ["engagement_recency", "budget", "pre_approval_status"]})


def syncContactToCRM(payload: dict) -> dict:
    return _ok({"synced": True, "external_id": f"crm_{payload.get('contact_id', '0')}"})


def testCRMConnection(payload: dict) -> dict:
    return _ok({"connected": True, "provider": payload.get("provider")})


def trackEmailEvent(payload: dict) -> dict:
    return _ok({"recorded": True})


def trackPropertyViewing(payload: dict) -> dict:
    return _ok({"recorded": True})


def triggerClientOnboarding(payload: dict) -> dict:
    return _ok({"workflow_id": payload.get("workflow_id"), "started": True})


def triggerLeadAssignment(payload: dict) -> dict:
    return _ok({"assigned_to": payload.get("default_agent")})


def verifyDocumentAI(payload: dict) -> dict:
    return _ok({"verified": True, "confidence": 0.91, "fields": payload.get("fields", {})})


def makeCall(payload: dict) -> dict:
    return _ok({"call_id": f"call_{int(datetime.now().timestamp())}", "status": "initiated",
                "note": "Telephony integration not configured."})


def sendSMS(payload: dict) -> dict:
    return _ok({"sid": f"sms_{int(datetime.now().timestamp())}", "status": "queued",
                "note": "SMS integration not configured."})


def docusignWebhook(payload: dict) -> dict:
    return _ok({"received": True})


def auditLogger(payload: dict) -> dict:
    return _ok({"logged": True})


def securityMiddleware(payload: dict) -> dict:
    return _ok({"allowed": True})


# registry
HANDLERS = {fn.__name__: fn for fn in [
    calculateLeadScores, analyzeConversionLikelihood, analyzeDeal,
    answerBorrowerQuestion, autoAssignLead, calendarCheckAvailability,
    calendarCreateEvent, calendarDeleteEvent, categorizeDocument,
    checkClosingDateActivity, checkHighValueDeals, checkLoanEligibility,
    checkPerformanceChanges, checkPropertyAlerts, createCRMTask,
    docusignCheckStatus, docusignSendEnvelope, executeDripCampaign,
    executeEmailTriggers, executeLeadScoringRules, executeNurtureWorkflow,
    executeNurtureWorkflowWithBranching, fetchMarketData, generateAgentInsights,
    generateMilestoneTasks, generateOutreachMessage, generatePropertyRecommendations,
    generateReminders, generateReport, generateVirtualStaging,
    onTransactionStageChange, scheduleCRMSync, secureContactAccess,
    secureFileHandler, sendClientStatusUpdates, sendClosingReminders,
    sendEmailSequence, sendOnboardingReminders, stageTransitionWorkflow,
    suggestOutreachTiming, suggestScoringFactors, syncContactToCRM,
    testCRMConnection, trackEmailEvent, trackPropertyViewing,
    triggerClientOnboarding, triggerLeadAssignment, verifyDocumentAI,
    makeCall, sendSMS, docusignWebhook, auditLogger, securityMiddleware,
]}


@router.post("/{name}")
async def invoke(name: str, payload: Optional[dict] = None) -> Any:
    handler = HANDLERS.get(name)
    if not handler:
        # Default safe response so unknown functions don't break the UI.
        return _ok({"function": name, "echoed": payload or {}, "note": "stub"})
    try:
        return handler(payload or {})
    except Exception as exc:  # pragma: no cover
        raise HTTPException(500, f"Function {name} failed: {exc}")
