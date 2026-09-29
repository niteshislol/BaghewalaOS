# 🛢️ BaghewalaOS 
**Coupled Thermal-Lift Digital Twin & Decision-Support Operating System**

> **Smart India Hackathon 2026** | **Problem Statement:** SIH26120  
> **Organization:** Oil India Limited  
> **Team:** Laptop Dega Dhoka (CSVTU Bhilai, Chhattisgarh)

---

## 📖 Introduction
Extracting ultra-viscous heavy oil (10,000+ cP) from the Baghewala Field in Rajasthan is incredibly challenging. When the cyclic steam injection decays, the heavy crude cools down in the upper wellbore, causing massive viscous friction that snaps and breaks the sucker rod pumps (SRP).

**BaghewalaOS** is a complete, well-to-surface **Digital Twin** that bridges thermodynamics and mechanics. While traditional SCADA systems *only monitor* what has already happened, BaghewalaOS *predicts and prevents* hardware failure. It forecasts exactly when rod floating will occur and provides engineers with an autonomous VFD speed governor, a safe "What-If" sandbox simulator, and a physics-grounded AI Copilot to safely optimize operations.

**Business Impact (ROI):** 
Preventing a single rod string failure saves an estimated **₹5 Lakhs in workover costs** and **48 hours of downtime**. Deployable across Oil India's Baghewala fields and scalable to ONGC's heavy oil assets (Santhal, Lanwa) via simple parameter tuning.

---

## ✨ Key Features (Unique Selling Points)

1. **🔥 Coupled Thermal-Lift Digital Twin**: The first software to directly couple subsurface steam thermal decay with mechanical rod drag and float risk.
2. **🤖 Zero-Hallucination AI Copilot**: Uses a "Physics Grounding Gate" to intercept engineering questions. The LLM extracts intent, our Python engine does the deterministic math, and the LLM formats the answer—guaranteeing 0% AI hallucination.
3. **🔬 "What-If" Simulation Sandbox**: Safely test changes to steam volume, soak days, and pump speed digitally before applying them to multimillion-rupee field equipment.
4. **⚙️ Autonomous VFD Governor**: Automatically calculates the maximum safe pump speed based on real-time downhole viscosity to prevent rod buckling.
5. **📱 Mobile-First & Multilingual**: Built for remote field operators with a 100dvh mobile layout and native language support in **English, Hindi (हिंदी), and Marwari (मारवाड़ी)**.
6. **🔒 Tamper-Evident SHA-256 Audit**: Every override and automated recommendation requires operator sign-off, which is cryptographically chained for strict safety compliance.
7. **🎥 Interactive 2D Canvas Twin**: Ditch static charts for a fully animated, real-time visualizer of surface walking beam motion and subsurface heat plumes.

---

## 🛠️ Technology Stack

- **Edge / Hardware Integration:** Modbus TCP & OPC-UA ready for direct VFD PLC telemetry ingestion.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Zustand, Capacitor (Android Native)
- **Backend (The Brain):** FastAPI, Python 3.10+, Uvicorn, Pydantic, SQLAlchemy
- **Physics Engine:** Custom Python scientific models for Marx-Langenheim heat transfer and Gibbs API RP 11L wave equations.
- **Machine Learning:** XGBoost (Surrogate Models), Scikit-Learn
- **AI Integration:** Google Gemini 2.0 (Flash/Pro)

---

## 🚀 Quick Start Guide

### Prerequisites
Make sure you have the following installed on your machine:
- **Python 3.10** or higher
- **Node.js** (v18 or higher)
- **Git**

### 1-Click Startup (Windows)
We have provided a unified startup script that will automatically install dependencies and launch both the backend and frontend servers simultaneously.

1. Open PowerShell and navigate to the project directory.
2. Run the startup script:
   ```powershell
   # Bypass execution policy if required
   powershell -ExecutionPolicy Bypass -File .\start.ps1
   ```
3. The script will automatically open your default browser to the application!

### Manual Startup (Cross-Platform)

**Terminal 1: Start the Backend (FastAPI)**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*API Documentation available at: http://localhost:8000/docs*

**Terminal 2: Start the Frontend (React/Vite)**
```bash
cd frontend
npm install
npm run dev
```
*Web Application available at: http://localhost:5173*

---

## 📂 Project Structure

```text
BaghewalaOS/
├── backend/            # FastAPI server, Physics engine, ML models, and Audit ledger
├── frontend/           # React 19 Client, Canvas Visualizer, and Capacitor Android bridge
├── data/               # Synthetic telemetry datasets and SCADA logs
├── docs/               # Detailed integration runbooks and reports
├── screenshots/        # Visual proofs and UI route previews
├── start.ps1           # Automated 1-click startup script
└── TECHNICAL_*.md      # Deep-dive architecture and tech stack documentation
```

---

## 📚 Further Reading & Documentation

For a comprehensive deep-dive into the mathematical models, API contracts, and the 8-tier architectural breakdown, please refer to:
👉 **[TECHNICAL_ARCHITECTURE_AND_SOLUTION.md](./TECHNICAL_ARCHITECTURE_AND_SOLUTION.md)**

For a full index of all documentation and phase reports, see:
👉 **[SOLUTION_INDEX.md](./SOLUTION_INDEX.md)**
