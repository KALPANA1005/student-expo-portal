====================================================
 STUDENT PROJECT EXPO PORTAL — FULL SETUP GUIDE
====================================================

WHAT'S WORKING NOW — ALL 3 DASHBOARDS FULLY CONNECTED TO MONGODB
--------------------------------------------------------------------
✅ Login + Register (Student/Admin/Judge) — real JWT auth
✅ Student Dashboard — Profile, Project registration, PPT upload,
   Event info, Judge info, Notifications, Result
✅ Admin Dashboard — Live stats, Student/PPT table with real
   Approve/Reject (+ auto email via Nodemailer), Judge management
   (Add/List/Delete), Judge assignment dropdown, Event management,
   Publish Result, Recent Activity feed
✅ Judge Dashboard — Judge sees ONLY the projects Admin approved AND
   assigned to them. Can download the student's PPT/PDF, evaluate
   with sliders (Presentation/Technical/Innovation/Documentation),
   submit marks — saved permanently to MongoDB, locked after submit


FOLDER STRUCTURE
------------------
student-expo-portal/
├── backend/
│   ├── models/          Student, Admin, Judge, Project, Event, Notification, Evaluation
│   ├── controllers/      authController, studentController, adminController, judgeController
│   ├── routes/           authRoutes, studentRoutes, adminRoutes, judgeRoutes
│   ├── middleware/        authMiddleware (JWT), uploadMiddleware (Multer)
│   ├── utils/             generateToken, sendEmail (Nodemailer)
│   ├── uploads/           PPT/PDF files land here
│   ├── seed.js             Creates demo Event + Admin + Judge accounts
│   └── server.js
└── frontend/            Plain HTML + CSS + JS
    ├── index.html, register-student.html
    ├── student-dashboard.html/.css/.js
    ├── admin-dashboard.html/.css/.js
    ├── judge-dashboard.html/.css/.js
    └── config.js


====================================================
 STEP 1 — GMAIL APP PASSWORD (needed for auto-email)
====================================================
1. Go to https://myaccount.google.com/security
2. Turn ON "2-Step Verification" if it isn't already on
3. Go to https://myaccount.google.com/apppasswords
4. Under "App name", type: Student Expo Portal
5. Click "Create"
6. Google shows a 16-character password — copy it WITHOUT spaces
   This goes into EMAIL_PASS in .env. EMAIL_USER is your Gmail address.


====================================================
 STEP 2 — BACKEND SETUP (Terminal 1)
====================================================

cd student-expo-portal/backend
npm install
# downloads express, mongoose, jwt, multer, nodemailer, etc.

copy .env.example .env
# Windows. Mac/Linux: cp .env.example .env

notepad .env
# Fill in these 4 things and save (Ctrl+S), then close Notepad:
#
#   MONGO_URI=<your real MongoDB Atlas connection string, ending in
#              /student_expo_portal?appName=Cluster0>
#   JWT_SECRET=<any long random text>
#   EMAIL_USER=<your Gmail address>
#   EMAIL_PASS=<the 16-character App Password from Step 1, no spaces>

npm run seed
# ONE-TIME command: creates a demo Event, demo Admin account
# (admin@gmail.com / admin123), and demo Judge account
# (judge@gmail.com / judge123)
# If it says "already exists, skipping" that's fine — it means you
# already seeded before, nothing to worry about.

npm run dev
# Starts the backend server. You should see:
#   MongoDB Connected: cluster0-xxxxx.mongodb.net
#   Server running on port 5000
#
# ⚠️ KEEP THIS TERMINAL WINDOW OPEN — closing it stops the backend

# If you see "MongoDB connection error: querySrv ECONNREFUSED":
#   This is a network/DNS issue, not a code issue. Run:
#     ipconfig /flushdns
#   If that doesn't fix it, change your Windows DNS to Google DNS
#   (8.8.8.8 / 8.8.4.4) under Network Connections -> your WiFi ->
#   Properties -> Internet Protocol Version 4 -> Properties.


====================================================
 STEP 3 — FRONTEND SETUP (Terminal 2 — open a NEW window)
====================================================

cd student-expo-portal/frontend
python -m http.server 5500
# (Windows: if "python" doesn't work, try "py -m http.server 5500")
#
# ⚠️ KEEP THIS TERMINAL WINDOW OPEN TOO


====================================================
 STEP 4 — OPEN THE APP
====================================================
Open your browser and go to:
  http://localhost:5500


====================================================
 STEP 5 — TEST THE FULL END-TO-END FLOW
====================================================

1. STUDENT: Click "Register as Student" → create an account using a
   REAL Gmail address you can check → auto-login → Student Dashboard
2. On "Project registration" tab, fill in project details, click Save
3. On "PPT submission" tab, upload a PDF or PPT file
4. Logout

5. ADMIN: Login with admin@gmail.com / admin123
6. On the Dashboard tab, find that student's row
7. Click the "Judge" dropdown next to their project → select a judge
   (use the seeded judge@gmail.com, or add a new one under Judges tab)
8. Click "Approve" on that student's project
   -> Status updates instantly
   -> An email is sent to the student's real inbox (Subject: "Project
      Expo - Project Selected")
   -> Check "Recent Activity" box — you'll see the approval logged
9. Logout

10. JUDGE: Login with judge@gmail.com / judge123
11. You'll see that exact project in "Approved projects" list on the left
12. Click on it → the evaluation form appears on the right
13. Click "⬇ Download PPT" — downloads the actual file the student uploaded
14. Drag the 4 sliders (Presentation/Technical/Innovation/Documentation)
    — watch the Total score update live
15. Write remarks, click "Submit marks"
    -> Saved to MongoDB permanently
    -> Project now shows "✓ Marks submitted" and is LOCKED — clicking
       it again shows "cannot edit" (matches the original spec)
16. Logout

17. ADMIN: Login again → Event tab → click "Publish Result to All Students"

18. STUDENT: Login again → "Result" tab → shows total marks + rank
    (rank is calculated by comparing marks across all evaluated projects)


IMPORTANT WORKFLOW NOTE
--------------------------
A judge can NOT see a project until Admin does BOTH of these:
  1. Approves the project (status = "Approved")
  2. Assigns that judge to it (via the dropdown)
If a judge logs in and sees "No projects assigned to you yet", it
means Admin hasn't done step 7-8 above for any of their projects yet.


TROUBLESHOOTING
-------------------
| Problem                              | Fix                                                                 |
|----------------------------------------|----------------------------------------------------------------------|
| "Cannot reach the server" on login      | Backend (Terminal 1) isn't running — check that window              |
| Email never arrives                     | Wrong EMAIL_USER/EMAIL_PASS, or 2-Step Verification not enabled     |
| MongoDB ECONNREFUSED / ENOTFOUND        | Network/DNS issue — run "ipconfig /flushdns" or switch DNS to 8.8.8.8 |
| Judge sees no projects                  | Admin must Approve AND Assign Judge first (see workflow note above) |
| "Cannot find module 'X'"                | Run: npm install                                                     |
| CORS error in browser console           | CLIENT_URL in backend .env must match http://localhost:5500         |
| Port 5000 or 5500 already in use         | Change the port number and update config.js to match                |


NEXT STEPS (future scope)
----------------------------
- Forgot password feature
- Edit judge details (currently only Add/Delete, not Edit, in UI)
- Deployment (Render + MongoDB Atlas) for a live URL
