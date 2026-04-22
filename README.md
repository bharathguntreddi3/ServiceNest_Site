<div align="center">

<!-- TOP WAVE -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0a0a0a,50:1a1a0a,100:0d2600&height=140&section=header&animation=fadeIn" width="100%"/>

<!-- LOGO -->
<img src="/src/assets/logo.png" alt="ServiceNest Logo" width="220"/>

<br/>

<!-- TAGLINE -->
<img src="https://readme-typing-svg.demolab.com?font=Exo+2&weight=700&size=16&pause=2000&color=7DBF2E&center=true&vCenter=true&width=500&lines=Trusted+Services+at+Your+Doorstep+%F0%9F%8F%A0;Connect.+Book.+Done.+%E2%9C%85;Your+Home%2C+Perfectly+Maintained+%F0%9F%94%A7" alt="Typing SVG" />

<br/><br/>

<!-- BADGES ROW -->
<p>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Firebase-Auth%20%26%20Storage-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" />
  <img src="https://img.shields.io/badge/Redux%20Toolkit-State%20Mgmt-764ABC?style=for-the-badge&logo=redux&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.x-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

<!-- LIVE DEMO BUTTON -->
<br/>

[![🚀 Live Demo](https://img.shields.io/badge/🚀%20LIVE%20DEMO-service--nest--site.vercel.app-7DBF2E?style=for-the-badge&labelColor=0a0a0a)](https://service-nest-site.vercel.app/)
[![⭐ Star this Repo](https://img.shields.io/github/stars/bharathguntreddi3/ServiceNest_Site?style=for-the-badge&color=f0a500&labelColor=1a1a1a)](https://github.com/bharathguntreddi3/ServiceNest_Site)

<br/>

</div>

---

<br/>

## 🏡 What is ServiceNest?

<div align="center">
<img src="public/logo.png" alt="ServiceNest" width="110" align="right" style="margin-left:20px"/>
</div>

> **ServiceNest** is a full-stack home services marketplace — think **Urban Company**, but open-source and fully customizable. It connects homeowners with skilled service professionals across categories like plumbing, cleaning, electrical work, carpentry, and more — all from one seamless platform.

Whether you're a **customer** booking your next home fix, a **service provider** managing your schedule, or an **admin** overseeing the entire ecosystem — ServiceNest has a dedicated, powerful dashboard built just for you.

<br/>

---

## ✨ Platform Highlights

<table>
<tr>
<td width="50%" valign="top">

### 👤 Customer Experience
- 🔍 **Browse & Book** services instantly
- 📅 Real-time booking & slot management
- 🔔 Live notifications for booking updates
- ⭐ Rate & review service providers
- 🔐 Google OAuth + Firebase Authentication
- 📦 Order history & rebooking

</td>
<td width="50%" valign="top">

### 🛠️ Provider Dashboard
- 📊 Analytics dashboard with Recharts
- ✅ Accept / Decline service requests
- 🗓️ Manage availability & schedule
- 💬 Customer communication panel
- 💰 Earnings summary & reports
- 🧾 Profile management & verification

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🛡️ Admin Control Panel
- 👁️ Full platform oversight
- 📈 Business analytics & trends
- 👷 Provider onboarding & approval
- 🚨 Dispute resolution tools
- 🗃️ Category & service management
- 📧 Email notifications via Nodemailer

</td>
<td width="50%" valign="top">

### ⚡ Tech-Powered Performance
- ⚡ **Vite 8** for blazing-fast builds
- 🌐 **Redis** caching for speed
- 📊 **Recharts** for data visualization
- 🎯 **React Intersection Observer** for smooth scroll animations
- 🔢 **React CountUp** for animated stats
- 📬 Toast notifications via **react-hot-toast**

</td>
</tr>
</table>

<br/>

---

## 🗂️ Project Structure

```
ServiceNest_Site/
├── 📁 src/
│   ├── 📁 components/       # Reusable UI components
│   ├── 📁 pages/            # Customer, Provider & Admin pages
│   ├── 📁 store/            # Redux Toolkit state management
│   ├── 📁 hooks/            # Custom React hooks
│   └── 📁 utils/            # Helper functions & constants
│
├── 📁 ServiceNestBackEnd/   # Backend services & API handlers
├── 📁 public/               # Static assets
├── index.html
├── vite.config.js
└── package.json
```

<br/>

---

## 🧰 Tech Stack

<div align="center">

| Layer | Technology |
|:---|:---|
| ⚛️ **Frontend** | React 19, React Router DOM v7 |
| 🎨 **Styling** | Tailwind CSS v4, Bootstrap 5, Bootstrap Icons |
| 🧠 **State** | Redux Toolkit + React-Redux |
| 🔐 **Auth** | Firebase Authentication + Google OAuth (`@react-oauth/google`) |
| ☁️ **Storage** | Firebase |
| 📡 **HTTP** | Axios |
| 🗃️ **Caching** | Redis |
| 📊 **Charts** | Recharts |
| 📧 **Email** | Nodemailer |
| 🚀 **Build Tool** | Vite 8 |
| 🌐 **Deployment** | Vercel |
| 📈 **Analytics** | Vercel Analytics |

</div>

<br/>

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A [Firebase](https://firebase.google.com/) project (for Auth & Storage)
- A [Redis](https://redis.io/) instance (optional, for caching)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/bharathguntreddi3/ServiceNest_Site.git

# 2. Navigate into the project directory
cd ServiceNest_Site

# 3. Install dependencies
npm install

# 4. Set up your environment variables
cp .env.example .env
# Fill in your Firebase config, Redis URL, Google OAuth credentials etc.

# 5. Start the development server
npm run dev
```

The app will be live at `http://localhost:5173` 🎉

### Build for Production

```bash
npm run build
npm run preview
```

<br/>

---

## 🌐 Live Demo

<div align="center">

[![Visit ServiceNest](https://img.shields.io/badge/🌐%20Visit%20ServiceNest-Live%20on%20Vercel-e94560?style=for-the-badge&labelColor=0f3460&logoColor=white)](https://service-nest-site.vercel.app/)

> Experience the full platform live — browse services, explore the dashboard, and see the UI in action.

</div>

<br/>

---

## 🎯 User Roles at a Glance

```
🏠 CUSTOMER  ──→  Browse → Book → Track → Review
🔧 PROVIDER  ──→  Register → Get Approved → Accept Jobs → Earn
👑 ADMIN     ──→  Manage Users → Monitor Platform → Handle Disputes
```

<br/>

---

## 🤝 Contributing

Contributions, issues and feature requests are always welcome! Here's how you can help:

1. 🍴 **Fork** this repository
2. 🌿 Create your feature branch: `git checkout -b feature/AmazingFeature`
3. 💾 Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. 📤 Push to the branch: `git push origin feature/AmazingFeature`
5. 🔃 Open a **Pull Request**

<br/>

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

<br/>

---

## 👨‍💻 Author

<div align="center">

<img src="public/logo.png" alt="ServiceNest" width="100"/>

<br/>

**Bharath Guntreddi**

[![GitHub](https://img.shields.io/badge/GitHub-bharathguntreddi3-181717?style=for-the-badge&logo=github)](https://github.com/bharathguntreddi3)

*Built with ❤️ to make home services simple, fast & reliable.*

</div>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d2600,50:1a1a0a,100:0a0a0a&height=130&section=footer&animation=fadeIn" width="100%"/>

<img src="public/logo.png" alt="ServiceNest" width="70"/>

<br/>

**⭐ If ServiceNest helped you, give it a star — it means the world!**

</div>
