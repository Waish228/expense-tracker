# 💸 MySpendTracker — Personal Expense Tracker

A full-stack personal expense tracker web app built with vanilla JavaScript and **Supabase** as the backend. Track your daily spending by category, view summaries, and manage your expenses — all stored persistently in the cloud.

## 🔗 Live Demo

🌐 **[View Live →]([https://trackmyspend-waish.netlify.app/])** 

## ✨ Features

- ➕ Add expenses with title, amount, category, and date
- 🗂️ Filter expenses by category
- 📊 Real-time total and summary calculations
- 🗑️ Delete individual expense entries
- ☁️ Cloud-backed storage via Supabase (PostgreSQL)
- 🔒 Row Level Security (RLS) enabled on the database

## 🛠️ Tech Stack

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)

## 📁 File Structure

```
expense-tracker/
├── index.html          # App UI
├── styles.css          # Stylesheet
├── app.js              # Frontend JavaScript logic
└── supabase-setup.sql  # Database schema and RLS policies
```

## 🚀 Setup & Run Locally

### 1. Clone the repo
```bash
git clone https://github.com/Waish228/expense-tracker.git
cd expense-tracker
```

### 2. Set up Supabase
- Create a free project at [supabase.com](https://supabase.com)
- Run the SQL from `supabase-setup.sql` in your Supabase SQL Editor
- Copy your **Project URL** and **anon public key**

### 3. Configure credentials
In `app.js`, replace the Supabase URL and key:
```js
const SUPABASE_URL = 'your-project-url';
const SUPABASE_KEY = 'your-anon-key';
```

### 4. Open in browser
Open `index.html` directly — no build step needed.

## 🗄️ Database Schema

The `supabase-setup.sql` file contains:
- Table creation for expenses
- RLS policies for secure data access

## 👤 Author

**Waish Alam** — [GitHub](https://github.com/Waish228) · [LinkedIn](https://linkedin.com/in/waish-alam)
```
