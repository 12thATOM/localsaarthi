import os
import io
import re
import pandas as pd
import google.generativeai as genai
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from datetime import datetime

# ── Load environment variables ────────────────────────────────────────────────
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ── In-memory data store ──────────────────────────────────────────────────────
class DataStore:
    """Holds all vendor data in memory — base CSV + uploads + manual entries."""

    def __init__(self):
        self.base_df: Optional[pd.DataFrame] = None
        self.uploaded_df: Optional[pd.DataFrame] = None
        self.manual_rows: list[dict] = []

    def load_base(self):
        try:
            base_path = os.path.dirname(__file__)
            csv_path = os.path.join(base_path, "public", "vendor_data.csv")
            if not os.path.exists(csv_path):
                csv_path = os.path.join(base_path, "single_vendor_grocery_ai_dataset.csv")
            self.base_df = pd.read_csv(csv_path)
            print(f"[OK] Loaded base dataset: {len(self.base_df)} rows")
        except Exception as e:
            print(f"[WARN] Could not load base CSV: {e}")
            self.base_df = pd.DataFrame()

    def combined(self) -> pd.DataFrame:
        frames = []
        if self.base_df is not None and len(self.base_df):
            frames.append(self.base_df)
        if self.uploaded_df is not None and len(self.uploaded_df):
            frames.append(self.uploaded_df)
        if self.manual_rows:
            frames.append(pd.DataFrame(self.manual_rows))
        if not frames:
            return pd.DataFrame()
        return pd.concat(frames, ignore_index=True)

store = DataStore()

# ── Business summary generator ────────────────────────────────────────────────
def build_summary(df: pd.DataFrame) -> str:
    if df.empty:
        return "No data available yet."

    cols = df.columns.tolist()
    summary_parts = []

    # Revenue
    if "revenue" in cols:
        total_rev = df["revenue"].sum()
        summary_parts.append(f"Total Revenue: ${total_rev:,.2f}")

    # Top products by revenue
    if "product_name" in cols and "revenue" in cols:
        top = df.groupby("product_name")["revenue"].sum().sort_values(ascending=False).head(5)
        summary_parts.append("Top 5 Products by Revenue: " + ", ".join(
            [f"{k} (${v:,.0f})" for k, v in top.items()]
        ))

    # Conversion
    if "views_count" in cols and "purchases_count" in cols and "product_name" in cols:
        agg = df.groupby("product_name").agg(
            views=("views_count", "sum"),
            purchases=("purchases_count", "sum")
        )
        agg["conv"] = agg["purchases"] / (agg["views"] + 1)
        best = agg.sort_values("conv", ascending=False).head(3)
        worst = agg.sort_values("conv", ascending=True).head(3)
        summary_parts.append("Best Converting: " + ", ".join(
            [f"{k} ({v:.1%})" for k, v in best["conv"].items()]
        ))
        summary_parts.append("Worst Converting: " + ", ".join(
            [f"{k} ({v:.1%})" for k, v in worst["conv"].items()]
        ))

    # Peak hours
    if "hour" in cols and "purchases_count" in cols:
        peak = df.groupby("hour")["purchases_count"].sum().sort_values(ascending=False).head(3)
        summary_parts.append("Peak Purchase Hours: " + ", ".join(
            [f"{int(h)}:00 ({int(c)} purchases)" for h, c in peak.items()]
        ))

    # Demand
    if "demand_score" in cols and "product_name" in cols:
        dem = df.groupby("product_name")["demand_score"].mean().sort_values(ascending=False).head(5)
        summary_parts.append("Highest Demand: " + ", ".join(
            [f"{k} ({v:.2f})" for k, v in dem.items()]
        ))

    return "\n".join(summary_parts)


# ── FastAPI setup ─────────────────────────────────────────────────────────────
app = FastAPI(title="VendorAI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    store.load_base()


# ── Pydantic models ──────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, Any]] = []

class SaleEntry(BaseModel):
    product_name: str
    price: float
    quantity: int
    timestamp: Optional[str] = None

class MarketplaceItem(BaseModel):
    id: int
    seller: str
    name: str
    price: float
    unit: str
    rating: float
    description: str

class MarketplaceAnalysisRequest(BaseModel):
    item_name: str
    price: float
    description: str

class MarketplaceCompareOffer(BaseModel):
    seller: str
    price: Optional[float] = None
    unit: Optional[str] = None
    rating: Optional[float] = None
    source: Optional[str] = None

class MarketplaceCompareRequest(BaseModel):
    item_name: str
    item_type: Optional[str] = None  # product/service
    category: Optional[str] = None
    your_seller: Optional[str] = None
    your_price: Optional[float] = None
    unit: Optional[str] = None
    description: Optional[str] = None
    offers: List[MarketplaceCompareOffer] = []


# ── Endpoints ─────────────────────────────────────────────────────────────────

# 1) Serve combined data as JSON to the frontend
@app.get("/data")
def get_data():
    df = store.combined()
    if df.empty:
        return {"rows": [], "columns": []}
    return {"rows": df.fillna("").to_dict(orient="records"), "columns": df.columns.tolist()}

# 2) Upload CSV
@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        new_df = pd.read_csv(io.BytesIO(contents))
        store.uploaded_df = new_df
        return {"message": f"Uploaded successfully — {len(new_df)} rows loaded.", "columns": new_df.columns.tolist()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {e}")

# 3) Manual sale entry
@app.post("/add_sale")
def add_sale(entry: SaleEntry):
    row = {
        "product_name": entry.product_name,
        "price": entry.price,
        "quantity": entry.quantity,
        "revenue": entry.price * entry.quantity,
        "timestamp": entry.timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "purchases_count": entry.quantity,
        "views_count": 0,
        "clicks_count": 0,
    }
    store.manual_rows.append(row)
    return {"message": "Sale recorded successfully.", "total_manual_entries": len(store.manual_rows)}

# 4) Chat — no API key from frontend
MODEL_NAME = "gemini-2.5-flash"

def fallback_chat_response(user_message: str, df: pd.DataFrame) -> str:
    """
    Keyless fallback so the demo stays functional without external AI.
    Keep it concise and action-oriented, based on available data summary.
    """
    msg = (user_message or "").strip().lower()
    summary = build_summary(df)

    if any(g in msg for g in ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"]):
        return "Hi! Tell me your goal (sales, pricing, inventory, or customers) and I’ll suggest the next best action."

    # Lightweight intent routing
    if any(k in msg for k in ["price", "pricing", "discount", "margin"]):
        return (
            "Trend Insight: Your pricing decisions should follow your top revenue and conversion signals.\n"
            "Recommended Action: Identify your top 3 revenue products and test a small price change (±3–5%) on one item.\n"
            "Expected Benefit: Better margin without hurting conversion.\n\n"
            f"Data snapshot:\n{summary}"
        )
    if any(k in msg for k in ["inventory", "stock", "reorder", "supplier", "lead time"]):
        return (
            "Trend Insight: Stockouts usually happen on high-demand items during peak purchase hours.\n"
            "Recommended Action: Reorder the highest-demand products and align replenishment before peak hours.\n"
            "Expected Benefit: Fewer lost sales from out-of-stock periods.\n\n"
            f"Data snapshot:\n{summary}"
        )
    if any(k in msg for k in ["customer", "segment", "retention", "repeat", "loyalty"]):
        return (
            "Trend Insight: Conversion gaps indicate where customers drop off.\n"
            "Recommended Action: Promote 1–2 best-converting products and bundle with a weaker converter.\n"
            "Expected Benefit: Higher basket size and improved overall conversion.\n\n"
            f"Data snapshot:\n{summary}"
        )

    return (
        "Trend Insight: Focus on the few products that drive most revenue.\n"
        "Recommended Action: Pick one metric to improve this week (conversion, AOV, or repeat rate) and run a small experiment.\n"
        "Expected Benefit: Measurable uplift without major operational changes.\n\n"
        f"Data snapshot:\n{summary}"
    )

def fallback_marketplace_analysis(item_name: str, price: float, description: str) -> str:
    name = (item_name or "This listing").strip()
    desc = (description or "").strip()
    has_desc = len(desc) >= 80
    is_quote = (price or 0) <= 0
    price_txt = "Quote-based" if is_quote else f"Price looks like ${price:,.2f}"
    return (
        f"Sales Prediction/Strategy: {name} can perform better with clearer differentiation; {price_txt}.\n"
        f"Recommended action: {'Add 2–3 concrete benefits, delivery/turnaround, and a clear unit of sale.' if not has_desc else 'Add proof (reviews, before/after, guarantees) and a limited-time offer to drive urgency.'}\n"
        "Engagement boost: Add a simple call-to-action (book a call, request quote, or bundle offer) and highlight response time."
    )

def fallback_marketplace_compare_analysis(req: MarketplaceCompareRequest) -> str:
    priced = [o for o in req.offers if o.price is not None]
    prices = sorted([float(o.price) for o in priced])
    your_price = req.your_price if req.your_price is not None else None

    if not prices:
        return (
            "Competitive Position: No comparable priced offers found.\n"
            "Recommendation: Ask for quotes from 3–5 vendors, standardize the unit, then set a starter price with a clear deliverable.\n"
            "Best practices: Add a clear unit (per kg/hour/project), delivery/turnaround time, and a simple CTA (request quote / order now)."
        )

    low = prices[0]
    high = prices[-1]
    median = prices[len(prices) // 2]

    position = "unknown"
    if your_price is not None:
        if your_price <= low:
            position = "lowest"
        elif your_price >= high:
            position = "highest"
        elif your_price <= median:
            position = "below-median"
        else:
            position = "above-median"

    unit = req.unit or "unit"
    name = (req.item_name or "This listing").strip()
    your_txt = "No 'your price' provided." if your_price is None else f"Your price: ${your_price:,.2f}/{unit}."

    strategy = {
        "lowest": "You are the cheapest—protect margin and avoid a race to the bottom.",
        "below-median": "You’re priced competitively—differentiate to win on value.",
        "above-median": "You’re above the median—justify premium with proof and guarantees.",
        "highest": "You’re the highest—either reposition as premium or reprice to regain volume.",
        "unknown": "Set your price against the observed range and test.",
    }[position]

    # Simple target: median - small discount if premium, or median + small uplift if lowest.
    target = median
    if your_price is not None and your_price >= median:
        target = max(low, median * 0.98)
    elif your_price is not None and your_price <= median:
        target = min(high, median * 1.02)

    return (
        f"Competitive Position: {name} market range is ${low:,.2f}–${high:,.2f}/{unit} (median ${median:,.2f}). {your_txt}\n"
        f"AI Recommendation: {strategy} Suggested test price: ${target:,.2f}/{unit} for 7 days.\n"
        "Best practices: Specify unit & deliverables, add social proof (ratings/reviews), publish turnaround time, and offer a bundle/volume tier to increase basket size."
    )

@app.post("/chat")
def chat_endpoint(request: ChatRequest):
    df = store.combined()
    data_context = build_summary(df)

    # Keep the system usable even without external AI.
    if not GEMINI_API_KEY:
        return {"response": fallback_chat_response(request.message, df)}

    system_prompt = f"""You are VendorAI, an intelligent business assistant for local vendors.
You have access to the vendor's real-time business data:

{data_context}

Rules:
- Keep all responses EXTREMELY concise (2-3 sentences max).
- When giving business advice, ALWAYS structure responses as:
  Trend Insight: [1 sentence]
  Recommended Action: [1 sentence]
  Expected Benefit: [1 sentence]
- If user asks greetings, reply conversationally in 1 sentence.
- Reference actual product names and numbers from the data above.
"""

    try:
        model = genai.GenerativeModel(MODEL_NAME, system_instruction=system_prompt)
        gemini_history = []
        for msg in request.history:
            gemini_history.append({"role": msg["role"], "parts": [msg["parts"]]})

        chat_session = model.start_chat(history=gemini_history)
        response = chat_session.send_message(request.message)
        return {"response": response.text}
    except Exception as e:
        print(f"Gemini API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Marketplace Data ──────────────────────────────────────────────────────────
MARKETPLACE_MOCK_DATA = [
    {"id": 1, "seller": "Local Farms", "name": "Organic Tomatoes", "price": 4.50, "unit": "kg", "rating": 4.8, "description": "Fresh, locally grown organic tomatoes."},
    {"id": 2, "seller": "City Bakery", "name": "Artisan Sourdough", "price": 6.00, "unit": "loaf", "rating": 4.9, "description": "Handcrafted sourdough bread baked daily."},
    {"id": 3, "seller": "Tech Fixers", "name": "Phone Screen Repair", "price": 85.00, "unit": "service", "rating": 4.5, "description": "Quick and reliable smartphone screen repair."},
    {"id": 4, "seller": "Green Thumbs", "name": "Landscaping Service", "price": 45.00, "unit": "hr", "rating": 4.7, "description": "Professional landscaping and lawn care."},
]

marketplace_uploaded_items = []

def _is_placeholder_market_item(it: dict) -> bool:
    name = str(it.get("name") or "").strip().lower()
    seller = str(it.get("seller") or "").strip().lower()
    desc = str(it.get("description") or "").strip().lower()
    price = it.get("price")

    bad_name = (not name) or (name == "unknown item") or (name == "untitled listing")
    bad_seller = (not seller) or (seller == "unknown seller")
    bad_desc = (not desc) or (desc == "no description provided.")
    bad_price = (price is None) or (isinstance(price, (int, float)) and float(price) == 0.0)

    # Consider it placeholder if it looks like auto-filled junk
    return (bad_name and bad_seller) or (bad_name and bad_desc) or (bad_seller and bad_desc) or (bad_name and bad_price)

@app.get("/marketplace")
def get_marketplace_data():
    cleaned_uploads = [it for it in marketplace_uploaded_items if not _is_placeholder_market_item(it)]
    return {"items": MARKETPLACE_MOCK_DATA + cleaned_uploads}

@app.post("/marketplace/upload")
async def upload_marketplace_csv(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        # Normalize headers for robust parsing (handles "Price ", "SELLER", etc.)
        df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
        new_items = []
        # Accept flexible column names and drop unusable rows (keeps marketplace clean).
        def pick(row, keys, default=None):
            for k in keys:
                if k in row and not pd.isna(row.get(k)):
                    v = row.get(k)
                    if isinstance(v, str) and not v.strip():
                        continue
                    return v
            return default

        def to_str(v):
            if v is None or (isinstance(v, float) and pd.isna(v)):
                return None
            s = str(v).strip()
            return s if s else None

        def to_float(v):
            if v is None or (isinstance(v, float) and pd.isna(v)):
                return None
            if isinstance(v, str):
                s = v.strip()
                if not s:
                    return None
                # Handle common currency/formatting: "₹1,200", "Rs 50", "$12.99", "120/kg"
                s = s.replace(",", "")
                s = re.sub(r"(rs\.?|inr|usd|eur|gbp|aud|cad|₹|\$|€|£)", "", s, flags=re.IGNORECASE).strip()
                # Extract first number from mixed strings (e.g. "120/kg")
                m = re.search(r"(-?\d+(?:\.\d+)?)", s)
                if not m:
                    return None
                try:
                    return float(m.group(1))
                except Exception:
                    return None
            try:
                return float(v)
            except Exception:
                return None

        def normalize_unit(s: str | None) -> str | None:
            if not s:
                return None
            u = s.strip().lower()
            if not u:
                return None
            # Extract unit from patterns like "per kg", "/kg", "kg", "kilogram"
            u = u.replace("per", " ").replace("/", " ")
            u = re.sub(r"\s+", " ", u).strip()
            # Pick the last token as unit hint
            token = u.split(" ")[-1]
            aliases = {
                "kgs": "kg",
                "kg": "kg",
                "kilogram": "kg",
                "kilograms": "kg",
                "g": "g",
                "gram": "g",
                "grams": "g",
                "l": "l",
                "lt": "l",
                "liter": "l",
                "litre": "l",
                "liters": "l",
                "litres": "l",
                "hr": "hr",
                "hour": "hr",
                "hours": "hr",
                "service": "service",
                "project": "project",
                "unit": "unit",
                "piece": "unit",
                "pcs": "unit",
                "pc": "unit",
                "loaf": "loaf",
            }
            return aliases.get(token, token)

        skipped = 0
        for _, row in df.iterrows():
            # Convert row index to dict with normalized keys
            row = row.to_dict()
            seller = to_str(pick(row, ["seller", "vendor", "company", "provider"]))
            name = to_str(pick(row, ["name", "item", "product", "product_name", "service", "title"]))
            if not seller or not name:
                skipped += 1
                continue

            price = to_float(pick(row, ["price", "rate", "cost", "amount"]))
            unit_raw = to_str(pick(row, ["unit", "uom", "per"]))
            unit = normalize_unit(unit_raw) or "unit"
            rating = to_float(pick(row, ["rating", "stars", "score"]))
            description = to_str(pick(row, ["description", "details", "about"])) or "No description provided."
            category = to_str(pick(row, ["category", "segment", "industry"]))
            item_type = to_str(pick(row, ["type", "listing_type"]))  # product/service

            new_item = {
                "id": len(MARKETPLACE_MOCK_DATA) + len(marketplace_uploaded_items) + len(new_items) + 1,
                "seller": seller,
                "name": name,
                "price": price,
                "unit": unit,
                "rating": rating,
                "description": description,
            }
            if category:
                new_item["category"] = category
            if item_type:
                new_item["type"] = item_type

            new_items.append(new_item)
        marketplace_uploaded_items.extend(new_items)
        msg = f"Added {len(new_items)} marketplace items successfully."
        if skipped:
            msg += f" Skipped {skipped} incomplete rows (missing seller or name)."
        return {"message": msg}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {e}")

@app.post("/marketplace/analyze")
def analyze_marketplace_item(request: MarketplaceAnalysisRequest):
    # Keep the marketplace demo usable even without external AI.
    if not GEMINI_API_KEY:
        return {"analysis": fallback_marketplace_analysis(request.item_name, request.price, request.description)}

    system_prompt = f"""You are VendorAI, an intelligent business assistant.
Analyze the following marketplace listing and provide actionable advice to the seller on how to increase sales and customer engagement.

Item: {request.item_name}
Price: ${request.price}
Description: {request.description}

Provide a highly concise response (2-3 sentences max) with:
- Sales Prediction/Market Strategy Insight
- Recommended action to increase customer engagement or stand out.
"""
    try:
        model = genai.GenerativeModel(MODEL_NAME, system_instruction=system_prompt)
        response = model.generate_content("Analyze this listing.")
        return {"analysis": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/marketplace/compare_analyze")
def analyze_marketplace_comparison(request: MarketplaceCompareRequest):
    # Keep the demo usable without external AI.
    if not GEMINI_API_KEY:
        return {"analysis": fallback_marketplace_compare_analysis(request)}

    offers_text = "\n".join(
        [
            f"- {o.seller}: {('Quote' if o.price is None else f'${o.price:.2f}')}/{(o.unit or request.unit or 'unit')} (rating: {o.rating if o.rating is not None else 'N/A'})"
            for o in request.offers[:20]
        ]
    )

    system_prompt = f"""You are VendorAI, an intelligent business assistant.
You will analyze a competitive set of vendor offers for the same listing and generate recommendations to increase sales.

Listing:
- Name: {request.item_name}
- Type: {request.item_type or 'unknown'}
- Category: {request.category or 'unknown'}
- Unit: {request.unit or 'unit'}
- Your seller: {request.your_seller or 'unknown'}
- Your price: {request.your_price if request.your_price is not None else 'unknown'}
- Description: {request.description or ''}

Comparable offers:
{offers_text}

Output requirements (max 6 short lines total):
1) Competitive Position (where your price sits vs range)
2) Recommended price test (a specific number + unit + duration)
3) Two best-practice improvements for the listing (copy/offer)
4) One trust-builder (proof/guarantee/SLA/returns)
5) One upsell/cross-sell idea
6) Expected impact (1 sentence)
"""
    try:
        model = genai.GenerativeModel(MODEL_NAME, system_instruction=system_prompt)
        response = model.generate_content("Generate pricing and sales recommendations.")
        return {"analysis": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
