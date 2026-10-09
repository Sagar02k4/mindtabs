<div align="center">
  <img src="https://via.placeholder.com/150" alt="MindTabs Logo" width="120" />
  <h1>MindTabs</h1>
  <p><em>Gain clarity. Reduce tab overload. Reclaim your focus.</em></p>

  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#installation">Installation</a> •
    <a href="#development">Development</a>
  </p>
</div>

---

**MindTabs** is a mindful Chrome extension that helps users manage tab overload by automatically tracking opened tabs, allowing them to tag their intent, and revisiting important tabs later through reminders. MindTabs focuses on reducing mental clutter and improving productivity with a beautifully simple, non-intrusive interface.

*(Formerly known as TabSense)*

## ✨ Features
- **Auto-Tracking & Intent Tagging**: Automatically capture open tabs and categorize them by your intent. 
- **Tab Dashboard**: A dedicated full-page dashboard to search, filter, and organize all your saved tabs effortlessly.
- **Smart Reminders**: Don't lose track of important pages. Set a reminder to revisit a specific tab later.
- **Cloud Sync**: Securely sync your tab data across devices using Supabase Authentication and Database.
- **Non-Intrusive Popup**: A beautiful, minimal popup to quickly save your current mindset without breaking your flow.

## 🛠 Tech Stack
Built with modern web technologies for blazing-fast performance:
- **Framework**: [React 18](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/) + [CRXJS](https://crxjs.dev/vite-plugin) for seamless Chrome Extension development
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Backend/Auth**: [Supabase](https://supabase.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🚀 Installation 

### Option 1: Load Unpacked (Developer Mode)
1. Download or clone this repository:
   ```bash
   git clone https://github.com/Sagar02k4/MindTabs.git
   ```
2. Navigate to the project folder and install dependencies:
   ```bash
   cd MindTabs
   npm install
   ```
3. Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_AUTH_PORTAL_URL=https://your-deployed-auth-portal.example.com/reset-password
   ```
   Use the project URL and public anon key from Supabase Project Settings → API. Never commit `.env` files or service-role keys.
4. Build the extension:
   ```bash
   npm run build
   ```
5. Open Google Chrome and go to `chrome://extensions/`.
6. Enable **Developer mode** in the top right corner.
7. Click **Load unpacked** and select the `dist` folder generated inside the project directory.

### Supabase setup

Run `supabase_schema.sql` in the Supabase SQL Editor before testing cloud sync. It enables row-level security so users can only access their own tabs and reminders. Apply later schema changes as migrations in production.

### Auth portal deployment

`WebAuthPortal` is a separate Vite app. Configure its `.env` with the same Supabase URL and public anon key, run `npm run build` inside that folder, and deploy its `dist` folder. Set the extension's `VITE_AUTH_PORTAL_URL` to the deployed `/reset-password` route, then rebuild the extension.

## 💻 Development
MindTabs uses Vite with Hot Module Replacement (HMR) specifically designed for Chrome Extensions via `@crxjs/vite-plugin`.

To start the development server:
```bash
npm run dev
```
Any changes you make to the source code will automatically reflect in the loaded extension.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome!

1. Fork the project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License
This project is licensed under the MIT License.
