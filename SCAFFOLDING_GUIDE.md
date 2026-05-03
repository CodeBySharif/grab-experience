# GrabCar Passenger Experience - Scaffolding Guide

This guide explains the repository architecture, tech stack decisions based on your preferences, and provides the step-by-step commands you need to manually scaffold the entire project.

---

## 1. Monorepo Architecture Explained

### What is a Monorepo?
A **Monorepo** (monolithic repository) is a single Git repository that contains the source code for multiple distinct projects, which might be related or entirely independent. In our case, the PWA, the ASP.NET Core API, and the Android App will all live in one repository under `grabservice-pwa/`.

### Advantages of a Monorepo
* **Unified Versioning & Commits:** A single commit can span across the frontend, backend, and mobile app, making it easy to track a feature from end-to-end.
* **Easier Code Sharing:** If you have shared types or utilities, it's easier to reference them (though sharing C# types with TypeScript usually requires code generation tools).
* **Simplified Tooling & Onboarding:** Developers only need to clone one repository to have the entire system context.

### What are the Alternatives?
The main alternative is a **Polyrepo** (or Multirepo), where each project gets its own repository (e.g., `grab-pwa-repo`, `grab-api-repo`, `grab-driver-repo`).
* **Advantages of Polyrepo:** Stricter boundaries, independent deployment pipelines, and smaller repository sizes. It prevents frontend devs from accidentally breaking backend pipelines.
* **When to choose:** Monorepos are fantastic for small teams or solo developers (like this project). Polyrepos are often used when large, disjointed teams work on separate microservices.

---

## 2. Tech Stack Decisions

Based on your feedback:
* **Backend:** We will stick to **ASP.NET Core Web API**. It is completely free.
* **Database:** We will use **SQLite** (via Entity Framework Core). It's a free, serverless, file-based database built into the system. You don't need to install or pay for SQL Server.
* **Real-time Updates:** Since you don't know Firebase, we will use **SignalR**. It is built directly into ASP.NET Core by Microsoft. It's completely free and relatively simple to learn for pushing real-time notifications (like requests) from the API to the Driver App.
* **YouTube Integration:** You will need to generate a free **YouTube Data API v3** key from Google Cloud Console.

---

## 3. Step-by-Step Manual Scaffolding Commands

Open your terminal (PowerShell or Command Prompt) and navigate to the `grabservice-pwa` folder. Then, execute the following steps:

### Step A: Initialize the Monorepo
```powershell
# 1. Initialize a Git repository (if not already done)
git init

# 2. Create a basic .gitignore file for the root
echo "node_modules/" > .gitignore
```

### Step B: Scaffold the PWA Frontend (React + TypeScript)
We will use Vite to scaffold the React application because it is much faster than Create React App.

```powershell
# 1. Scaffold the React app using Vite
npm create vite@latest frontend -- --template react-ts

# 2. Navigate into the frontend and install dependencies
cd frontend
npm install

# 3. Go back to the root folder
cd ..
```

### Step C: Scaffold the Backend API (ASP.NET Core)
Ensure you have the .NET SDK installed on your machine.

```powershell
# 1. Create a new ASP.NET Core Web API project named "Backend"
dotnet new webapi -n Backend -o backend

# 2. Create a Solution file in the root (optional but recommended for Visual Studio/VS Code)
dotnet new sln -n GrabService

# 3. Add the Backend project to the Solution
dotnet sln add backend/Backend.csproj

# 4. Navigate into the backend and add Entity Framework Core packages for SQLite
cd backend
dotnet add package Microsoft.EntityFrameworkCore.Sqlite
dotnet add package Microsoft.EntityFrameworkCore.Tools

# 5. Go back to the root folder
cd ..
```

### Step D: Scaffold the Driver App Directory (Android)
Since Android projects are best generated via Android Studio, we will just create the directory for now.

```powershell
# 1. Create the directory
mkdir driver-app

# NOTE: To actually scaffold the Android project, open Android Studio, select "New Project", 
# choose "Empty Views Activity" or "Empty Compose Activity", and set the save location to this `driver-app` folder.
```

---

## 4. Setting up the YouTube Data API Key

Since you don't have an API key yet, here is how you can get one for free:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Sign in with your Google account.
3. Click on the Project dropdown at the top and click **New Project**. Name it "GrabCar Playlist".
4. Once the project is created, select it.
5. In the left sidebar, go to **APIs & Services > Library**.
6. Search for **YouTube Data API v3** and click **Enable**.
7. Go to **APIs & Services > Credentials**.
8. Click **+ CREATE CREDENTIALS** and select **API key**.
9. Copy this key. You will need to securely store this in your Backend API's `appsettings.json` later. 

> [!WARNING]
> Keep your API key secret! Never commit it directly to a public GitHub repository.

---

**You are now ready to start scaffolding! Open your terminal, navigate to `c:\Users\lenovo\.gemini\antigravity\scratch\grabservice-pwa`, and follow the commands above.**
