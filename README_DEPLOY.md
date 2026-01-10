# Deployment Guide (Free Stack)

This project is configured to be deployed for **free** using [Render.com](https://render.com) (Frontend + Backend) and [Neon.tech](https://neon.tech) (PostgreSQL Database).

## Prerequisites
1.  A GitHub account with this project pushed to a repository.

## Step 1: Database Setup (Neon.tech)
1.  Go to [Neon.tech](https://neon.tech) and sign up.
2.  Create a new project.
3.  Copy the **Connection String** (It looks like `postgres://user:password@...`).
    *   *Note: Select "Pooled connection" if available, but the standard one works too.*

## Step 2: Deployment (Render.com)
1.  Go to [Render.com](https://render.com) and sign up.
2.  Click **"New + "** -> **"Web Service"**.
3.  Select "Build and deploy from a Git repository" and connect your GitHub account.
4.  Select this repository.
5.  **Configure the service:**
    *   **Name:** `pakals-app` (or any name)
    *   **Region:** Closest to you (e.g., Singapore, Frankfurt)
    *   **Branch:** `main` (or master)
    *   **Root Directory:** (Leave blank)
    *   **Runtime:** `Node`
    *   **Build Command:** `npm install && npm run build` (Make sure not to copy any backticks!)
    *   **Start Command:** `npm start`
    *   **Instance Type:** Free

6.  **Environment Variables:**
    Scroll down to "Environment Variables" and add these keys:

    | Key | Value |
    | :--- | :--- |
    | `DATABASE_URL` | Paste your Neon Connection String from Step 1 |
    | `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |
    | `API_KEY` | Your Gemini AI API Key |
    | `SESSION_SECRET` | Any random long string (e.g. `somerandomsecret123`) |
    | `NODE_ENV` | `production` |

7.  Click **"Create Web Service"**.

## Done!
Render will detect the push, install dependencies, build the React frontend, and start the Express server. Your app will be live at `https://your-app-name.onrender.com`.
