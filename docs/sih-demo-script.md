# Smriti — Official SIH Judge Live Demonstration Script (5–7 Minutes)

### SIH Problem Statement
**“AI-Based Cognitive Gaming and Memory Assistance Platform for Elderly Dementia Patients in North Eastern Region (NER)”**

---

## Demonstration Overview

| Stage | Duration | Primary Actor | Key Technical Capability Demonstrated |
| :--- | :--- | :--- | :--- |
| **Stage 1: Caretaker Studio Setup** | 1.5 mins | Caretaker (Aryan) | Multi-category profile curation, NER cultural anchoring, routine & 4 reminder types, media vault upload. |
| **Stage 2: Elderly Senior Space** | 2.5 mins | Elderly User (Sruti) | Personalized greeting, spoken voice guidance (Web Speech TTS in Assamese/English), memory recall game. |
| **Stage 3: Adaptive Engine & Offline Sync** | 1.5 mins | Elderly User (Sruti) | Deterministic performance evaluation, difficulty scaling ($L1 \rightarrow L2$), offline queueing & reconnection auto-sync. |
| **Stage 4: Caregiver Insights & Alerts** | 1.0 min | Caretaker (Aryan) | Live non-diagnostic performance analytics, category accuracy trends, and support alert acknowledgment. |

---

## Step-by-Step Live Demo Protocol

### Stage 1: Caretaker Configuration & Personalization (1.5 mins)
1. **Sign In as Caretaker**:
   - Navigate to `http://localhost:3000/auth`.
   - Click **Sign In with Google** (Caretaker Aryan).
   - Redirects to `/caretaker-studio`.
2. **Select Connected Elderly User**:
   - In the patient selector dropdown, select **Sruti (Assam, Brahmaputra Valley)**.
   - *Judge Talking Point:* "Smriti uses a secure many-to-many relationship architecture. Caretakers only see data for authorized patients; unrelated caretakers receive HTTP 403."
3. **Configure NER Cultural Anchors & Profile**:
   - In the **Profile & Cultural Anchor** tab:
     - Set Preferred Language to **Assamese (`as`)**.
     - Set Region to **Assam (Brahmaputra Valley)**.
     - Note registered anchors: *Jaapi*, *Phulam Gamosa*, *Pepa*, *Brass Xorai*, *Tea Gardens*.
4. **Inspect Memory Vault & Routine**:
   - In **Memories & Media**: Show uploaded nostalgic photos (Tezpur Tea Garden Walk) and audio (Traditional Bihu Folk Flute).
   - In **Daily Routine**: Show *07:30 AM — Morning Tea & Brahmaputra Walk*.
   - In **Health & Reminders**: Show 4 scheduled items (Blood Pressure Medication, Hydration, Memory Exercise, Doctor Appointment).
   - Click **Preview Elderly Space** to show the live aggregated preview.

---

### Stage 2: Elderly User Experience & Voice Guidance (2.5 mins)
1. **Switch to Senior Space**:
   - Navigate to `http://localhost:3000/senior-space`.
   - The screen renders an accessible, high-contrast, large-touch interface.
   - Dynamic greeting displays: *"Good morning, Sruti ❤️"*.
2. **Explore Familiar Anchors**:
   - **My Family**: View cards for daughter Nahida with memory prompts.
   - **My Memories**: View photo gallery of familiar places.
   - **My Music**: Click Play on Bihu Folk Flute (streams real MP3 binary from Cloud Storage).
   - **Today's Routine**: View chronological timeline.
3. **Launch Cognitive & Memory Space**:
   - Scroll to **Section 5: Cognitive & Memory Space**.
   - Select **Memory** tab.
   - Dynamic question appears: *"Who is this family member who lives in Tezpur?"* with Nahida's avatar and personalized options.
4. **Demonstrate Spoken Voice Guidance**:
   - Click the **🔊 Listen** button.
   - Web Speech API reads the question gently at an elderly-accessible cadence ($0.85\times$ speed).
5. **Answer Question & Immediate Positive Feedback**:
   - Click the correct option (*"Nahida"*).
   - Card glows green with celebratory feedback (*"Very Good! Wonderful memory."*) and plays audio chime.
   - Score updates immediately.

---

### Stage 3: Deterministic Adaptive Difficulty & Offline Sync (1.5 mins)
1. **Demonstrate Adaptive Difficulty Scaling**:
   - *Judge Talking Point:* "Smriti avoids black-box ML claims. It uses a transparent, deterministic performance engine evaluating accuracy, latency, and hints."
   - **High Performance ($>80\%$ accuracy, fast response)**: Engine promotes session to Level 2 with more answer options or subtle distractors.
   - **Struggling Performance ($<50\%$ accuracy, slow response, multiple hints)**: Engine reduces difficulty back to Level 1, sets `supportLevel: 'high'`, and generates a Caregiver Support Alert.
2. **Demonstrate Offline-First Capability**:
   - Open Browser Developer Tools $\rightarrow$ Network tab $\rightarrow$ Toggle **Offline**.
   - Status badge in Senior Space updates to **⚡ Offline Mode (Sessions saved locally)**.
   - Launch another cognitive activity (e.g. *Pattern Recognition — Traditional Jaapi*).
   - Answer the question. Session is saved to `localStorage` queue.
   - Toggle Network back to **Online**.
   - Status badge flashes **🔄 Synced 1 session to cloud**, and session is persisted to Firestore idempotently with zero duplicate risk.

---

### Stage 4: Caregiver Insights & Support Alert Acknowledgment (1.0 min)
1. **Return to Caretaker Studio**:
   - Switch back to `/caretaker-studio`.
   - Click the **Configuration & Insights** tab (`tab-insights`).
2. **View Live Computed Performance Trends**:
   - **Total Sessions Completed**: e.g., *12 Sessions*.
   - **Average Task Accuracy**: e.g., *88%*.
   - **Avg Response Time**: e.g., *3.4s*.
   - **Adaptive Difficulty**: *Level 2*.
   - **Category Engagement Breakdown**: Memory, Attention, Routine Recall, Pattern Recognition, Emotional Engagement.
3. **Acknowledge Support Alert**:
   - Point to the **Caregiver Support Alerts** section.
   - An alert appears: *"Gentle support or caregiver companionship may be helpful for memory activities."*
   - *Judge Talking Point:* "Notice our non-diagnostic care language. Smriti never claims 'Dementia detected' or generates clinical diagnostic conclusions."
   - Click **✓ Acknowledge**.
   - Alert status transitions to `acknowledged` in real-time.

---

## 5. Judge Q&A Defense Key Points

| Expected Question | Smriti Defense |
| :--- | :--- |
| **"Why deterministic adaptation instead of deep neural networks?"** | For dementia care, deterministic rules are transparent, auditable by physicians, have zero hallucination risk, and execute instantly with 0ms latency even when fully offline in rural NER connectivity zones. |
| **"How does Smriti handle diverse North Eastern languages?"** | Our cultural localization engine supports Assamese, Bengali, Hindi, and English out of the box, with extensible JSON dictionaries and Web Speech API phonetic voice synthesis. |
| **"How is patient privacy protected across multiple caregivers?"** | All endpoints enforce strict many-to-many relationship authorization. Unrelated caregivers receive HTTP 403. Healthcare workers have dedicated read-only monitoring access without access to private memory editing. |
| **"What happens when there is no internet in remote areas?"** | Senior Space is offline-first. Activity packages are cached locally, answers are queued in IndexedDB/localStorage, and automatic batch synchronization occurs upon network reconnection with duplicate prevention. |
