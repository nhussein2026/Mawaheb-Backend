const express = require("express");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const courseRoutes = require("./routes/courseRoutes");
const noteRoutes = require("./routes/noteRoutes");
const userAchievementRoutes = require("./routes/userAchievementRoutes");
const eventRoutes = require("./routes/eventRoutes");
const difficultyRoutes = require("./routes/difficultyRoutes");
const studentReportRoutes = require("./routes/studentReportRoutes");
const financialReportRoutes = require("./routes/financialReportRoutes");
const statRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const scholarshipStudentRoutes = require("./routes/scholarshipStudentRouts");
const semesterRoutes = require("./routes/semesterRoutes");

require("dotenv").config();
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const app = express();

// Enable All CORS Requests
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const connectDB = require("./config/db");

// Health check function
const getHealthStatus = async () => {
  const status = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version,
    database: {
      status: "disconnected",
      readyState: mongoose.connection.readyState,
      host: null,
      name: null,
      error: null,
    },
    routes: {
      total: 0,
      endpoints: [],
    },
  };

  // Check database connection
  try {
    await connectDB();
    status.database.status =
      mongoose.connection.readyState === 1 ? "connected" : "connecting";
    status.database.host = mongoose.connection.host;
    status.database.name = mongoose.connection.name;

    // Test database query
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    status.database.collections = collections.length;
    status.database.collectionNames = collections.map((c) => c.name);
  } catch (error) {
    status.database.status = "error";
    status.database.error = error.message;
  }

  // Count routes
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === "router") {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods),
          });
        }
      });
    }
  });

  status.routes.total = routes.length;
  status.routes.endpoints = routes;

  return status;
};

// Beautiful HTML health check page
const getHealthHTML = (healthData) => {
  const statusColor =
    healthData.database.status === "connected" ? "#10b981" : "#ef4444";
  const statusIcon = healthData.database.status === "connected" ? "✅" : "❌";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mawaheb Backend - Health Status</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            padding: 40px;
        }
        
        .status-card {
            background: #f8fafc;
            border-radius: 15px;
            padding: 25px;
            border-left: 5px solid #4f46e5;
            transition: transform 0.3s ease;
        }
        
        .status-card:hover {
            transform: translateY(-5px);
        }
        
        .status-card h3 {
            color: #1e293b;
            margin-bottom: 15px;
            font-size: 1.3rem;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .status-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .status-item:last-child {
            border-bottom: none;
        }
        
        .status-label {
            font-weight: 500;
            color: #64748b;
        }
        
        .status-value {
            font-weight: 600;
            color: #1e293b;
        }
        
        .status-success {
            color: #10b981;
        }
        
        .status-error {
            color: #ef4444;
        }
        
        .routes-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 10px;
            margin-top: 15px;
        }
        
        .route-item {
            background: white;
            padding: 10px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 0.9rem;
        }
        
        .collections-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }
        
        .collection-tag {
            background: #4f46e5;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
        }
        
        .footer {
            background: #f1f5f9;
            padding: 20px 40px;
            text-align: center;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
        }
        
        .emoji {
            font-size: 1.5rem;
            margin-right: 10px;
        }
        
        .refresh-btn {
            background: #4f46e5;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            margin-top: 20px;
            transition: background 0.3s ease;
        }
        
        .refresh-btn:hover {
            background: #3730a3;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Mawaheb Backend API</h1>
            <p>System Health & Status Dashboard</p>
            <button class="refresh-btn" onclick="window.location.reload()">🔄 Refresh Status</button>
        </div>
        
        <div class="status-grid">
            <div class="status-card">
                <h3><span class="emoji">📊</span>System Status</h3>
                <div class="status-item">
                    <span class="status-label">Status</span>
                    <span class="status-value status-success">🟢 Operational</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Environment</span>
                    <span class="status-value">${healthData.environment}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Uptime</span>
                    <span class="status-value">${Math.floor(
                      healthData.uptime / 3600
                    )}h ${Math.floor(
    (healthData.uptime % 3600) / 60
  )}m ${Math.floor(healthData.uptime % 60)}s</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Platform</span>
                    <span class="status-value">${healthData.platform}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Node Version</span>
                    <span class="status-value">${healthData.nodeVersion}</span>
                </div>
            </div>
            
            <div class="status-card">
                <h3><span class="emoji">🗄️</span>Database Status</h3>
                <div class="status-item">
                    <span class="status-label">Connection</span>
                    <span class="status-value ${
                      healthData.database.status === "connected"
                        ? "status-success"
                        : "status-error"
                    }">
                        ${statusIcon} ${healthData.database.status.toUpperCase()}
                    </span>
                </div>
                ${
                  healthData.database.host
                    ? `
                <div class="status-item">
                    <span class="status-label">Host</span>
                    <span class="status-value">${healthData.database.host}</span>
                </div>
                `
                    : ""
                }
                ${
                  healthData.database.name
                    ? `
                <div class="status-item">
                    <span class="status-label">Database</span>
                    <span class="status-value">${healthData.database.name}</span>
                </div>
                `
                    : ""
                }
                ${
                  healthData.database.collections
                    ? `
                <div class="status-item">
                    <span class="status-label">Collections</span>
                    <span class="status-value">${healthData.database.collections}</span>
                </div>
                `
                    : ""
                }
                ${
                  healthData.database.collectionNames
                    ? `
                <div class="collections-list">
                    ${healthData.database.collectionNames
                      .map(
                        (name) => `<span class="collection-tag">${name}</span>`
                      )
                      .join("")}
                </div>
                `
                    : ""
                }
                ${
                  healthData.database.error
                    ? `
                <div class="status-item">
                    <span class="status-label">Error</span>
                    <span class="status-value status-error">${healthData.database.error}</span>
                </div>
                `
                    : ""
                }
            </div>
            
            <div class="status-card">
                <h3><span class="emoji">💾</span>Memory Usage</h3>
                <div class="status-item">
                    <span class="status-label">RSS</span>
                    <span class="status-value">${(
                      healthData.memory.rss /
                      1024 /
                      1024
                    ).toFixed(2)} MB</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Heap Used</span>
                    <span class="status-value">${(
                      healthData.memory.heapUsed /
                      1024 /
                      1024
                    ).toFixed(2)} MB</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Heap Total</span>
                    <span class="status-value">${(
                      healthData.memory.heapTotal /
                      1024 /
                      1024
                    ).toFixed(2)} MB</span>
                </div>
                <div class="status-item">
                    <span class="status-label">External</span>
                    <span class="status-value">${(
                      healthData.memory.external /
                      1024 /
                      1024
                    ).toFixed(2)} MB</span>
                </div>
            </div>
            
            <div class="status-card">
                <h3><span class="emoji">🛣️</span>API Routes</h3>
                <div class="status-item">
                    <span class="status-label">Total Endpoints</span>
                    <span class="status-value">${healthData.routes.total}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Available Routes</span>
                    <span class="status-value">
                        /auth, /user, /admin, /courses, /certificates, /events, /notes, /stats
                    </span>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>🕐 Last updated: ${healthData.timestamp}</p>
            <p>💡 This page automatically refreshes every 30 seconds</p>
        </div>
    </div>
    
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => {
            window.location.reload();
        }, 30000);
        
        // Add some animation
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.status-card');
            cards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.transition = 'all 0.6s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 100);
            });
        });
    </script>
</body>
</html>`;
};

// Health check route
app.get("/", async (req, res) => {
  try {
    const healthData = await getHealthStatus();

    // Return JSON if requested
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.json({
        status: "success",
        message: "Mawaheb Backend API is running successfully",
        data: healthData,
      });
    }

    // Return beautiful HTML page
    const htmlPage = getHealthHTML(healthData);
    res.send(htmlPage);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "error",
      message: "Health check failed",
      error: error.message,
    });
  }
});

// JSON health endpoint
app.get("/health", async (req, res) => {
  try {
    const healthData = await getHealthStatus();
    res.json({
      status: "success",
      message: "Mawaheb Backend API is running successfully",
      data: healthData,
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "error",
      message: "Health check failed",
      error: error.message,
    });
  }
});

// Routes
app.use("/user", userRoutes);
app.use("/stats", statRoutes);
app.use("/auth", authRoutes);
app.use("/", certificateRoutes);
app.use("/", courseRoutes);
app.use("/", noteRoutes);
app.use("/", userAchievementRoutes);
app.use("/", eventRoutes);
app.use("/", difficultyRoutes);
app.use("/", studentReportRoutes);
app.use("/", financialReportRoutes);
app.use("/scholarship-student", scholarshipStudentRoutes);
app.use("/semester", semesterRoutes);
app.use("/admin", adminRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({
    status: "error",
    message: "Internal server error",
    error: error.message,
  });
});

// Start the server (for local development)
const PORT = process.env.PORT || 3005;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;
