"""
Database Seeding Script for AI-Based Software Bug Prediction System.
Pre-populates the database with realistic software modules, predictions,
and analyzed source code files (.java, .py, .cpp, .c).
"""
from datetime import datetime, timedelta
from app.core.database import SessionLocal, Base, engine
from app.models.module import Module
from app.models.prediction import PredictionRecord
from app.models.code_analysis import CodeAnalysisRecord
from app.services.ml_engine import bug_predictor
from app.services.recommendation import recommendation_engine
from app.services.code_analyzer import code_analyzer
from app.services.code_recommendations import code_recommendation_engine

SAMPLE_MODULES = [
    {
        "name": "PaymentGatewayService.ts",
        "description": "Handles multi-provider credit card authorization, 3D secure callbacks, and refund transaction webhooks.",
        "loc": 1840,
        "complexity": 34.5,
        "commits": 88
    },
    {
        "name": "SqlMigrationRunner.py",
        "description": "Applies incremental schema migrations, foreign key validation, and DDL rollback executions.",
        "loc": 1250,
        "complexity": 28.0,
        "commits": 64
    },
    {
        "name": "AuthTokenValidator.ts",
        "description": "JWT cryptographic validation, RSA public key rotation, and session claim decryption.",
        "loc": 320,
        "complexity": 8.5,
        "commits": 14
    },
    {
        "name": "OrderProcessingPipeline.java",
        "description": "Asynchronous order state machine, inventory reservation, and discount rule calculations.",
        "loc": 2100,
        "complexity": 42.0,
        "commits": 105
    },
    {
        "name": "CsvDataStreamParser.go",
        "description": "Buffered streaming CSV tokenizer with character escape handling and type coercion.",
        "loc": 640,
        "complexity": 18.2,
        "commits": 32
    },
    {
        "name": "NotificationDispatcher.py",
        "description": "FCM and Apple APNS push notification distributor with exponential backoff retry.",
        "loc": 580,
        "complexity": 14.0,
        "commits": 22
    }
]

SAMPLE_SOURCE_FILES = [
    {
        "file_name": "OrderProcessor.java",
        "code": """package com.app.billing;

import java.util.*;

public class OrderProcessor {
    private final Map<String, Double> rates = new HashMap<>();
    private int processedCount = 0;

    public OrderProcessor() {
        rates.put("STANDARD", 1.0);
        rates.put("EXPEDITED", 1.5);
    }

    public boolean processTransaction(String orderId, double amount, String tier, int flags) {
        if (amount <= 0 || orderId == null || orderId.isEmpty()) {
            return false;
        }

        double fee = 0.0;
        if (tier.equals("VIP")) {
            fee = amount * 0.01;
            if (amount > 10000) {
                fee = amount * 0.005;
            }
        } else if (tier.equals("STANDARD")) {
            fee = amount * 0.03;
            if (flags > 2) {
                fee += 5.0;
            }
        } else {
            fee = amount * 0.05;
        }

        switch (flags) {
            case 1:
                System.out.println("Applying promo discount");
                break;
            case 2:
                System.out.println("Fraud check review");
                break;
            default:
                break;
        }

        for (int i = 0; i < 3; i++) {
            if (verifyGateway(orderId, fee)) {
                processedCount++;
                return true;
            }
        }
        return false;
    }

    private boolean verifyGateway(String id, double fee) {
        return fee >= 0 && id.length() > 2;
    }
}
""",
        "commits": 45
    },
    {
        "file_name": "auth_service.py",
        "code": """import hashlib
import time

class AuthService:
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.active_sessions = {}

    def authenticate(self, username: str, token: str) -> bool:
        \"\"\"Validates user credentials against cryptographic token.\"\"\"
        if not username or not token:
            return False
        
        expected = hashlib.sha256(f"{username}:{self.secret_key}".encode()).hexdigest()
        if expected == token:
            self.active_sessions[username] = time.time()
            return True
        return False

    def is_session_valid(self, username: str, max_age: int = 3600) -> bool:
        if username not in self.active_sessions:
            return False
        return (time.time() - self.active_sessions[username]) < max_age
""",
        "commits": 10
    },
    {
        "file_name": "data_buffer.cpp",
        "code": """#include <iostream>
#include <vector>
#include <string>

class CircularBuffer {
private:
    std::vector<int> buffer;
    size_t head = 0;
    size_t tail = 0;
    size_t capacity;
    bool is_full = false;

public:
    CircularBuffer(size_t cap) : capacity(cap) {
        buffer.resize(capacity);
    }

    void push(int item) {
        buffer[head] = item;
        if (is_full) {
            tail = (tail + 1) % capacity;
        }
        head = (head + 1) % capacity;
        is_full = (head == tail);
    }

    bool pop(int &val) {
        if (!is_full && head == tail) {
            return false;
        }
        val = buffer[tail];
        is_full = false;
        tail = (tail + 1) % capacity;
        return true;
    }
};
""",
        "commits": 18
    },
    {
        "file_name": "packet_parser.c",
        "code": """#include <stdio.h>
#include <string.h>

struct PacketHeader {
    unsigned short id;
    unsigned short length;
    unsigned char checksum;
};

int validate_packet(const unsigned char *buffer, int size) {
    if (size < 5 || buffer == NULL) {
        return -1;
    }

    unsigned char calc_sum = 0;
    for (int i = 0; i < size - 1; i++) {
        calc_sum ^= buffer[i];
    }

    if (calc_sum != buffer[size - 1]) {
        return 0; // Checksum failure
    }
    return 1; // Valid
}
""",
        "commits": 8
    }
]

def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Seed Modules if empty
        if db.query(Module).count() == 0:
            print("Seeding software modules...")
            base_time = datetime.utcnow() - timedelta(days=14)
            for i, item in enumerate(SAMPLE_MODULES):
                pred = bug_predictor.predict(item["loc"], item["complexity"], item["commits"])
                recs = recommendation_engine.generate_recommendations(
                    item["loc"], item["complexity"], item["commits"],
                    pred["risk_score"], pred["risk_level"]
                )
                mod_time = base_time + timedelta(days=i)
                module = Module(
                    name=item["name"],
                    description=item["description"],
                    loc=item["loc"],
                    complexity=item["complexity"],
                    commits=item["commits"],
                    last_risk_score=pred["risk_score"],
                    last_risk_level=pred["risk_level"],
                    last_predicted_at=mod_time,
                    created_at=mod_time - timedelta(days=30),
                    updated_at=mod_time
                )
                db.add(module)
                db.flush()

                record = PredictionRecord(
                    module_id=module.id,
                    module_name=module.name,
                    loc=module.loc,
                    complexity=module.complexity,
                    commits=module.commits,
                    risk_score=pred["risk_score"],
                    risk_level=pred["risk_level"],
                    explanation={"factors": pred["metric_factors"], "summary": pred["summary_explanation"]},
                    recommendations=recs,
                    created_at=mod_time
                )
                db.add(record)
            db.commit()

        # Seed Code Analysis Records if empty
        if db.query(CodeAnalysisRecord).count() == 0:
            print("Seeding source code analysis records...")
            base_time = datetime.utcnow() - timedelta(days=7)
            for i, item in enumerate(SAMPLE_SOURCE_FILES):
                analysis = code_analyzer.analyze(item["file_name"], item["code"], commits=item["commits"])
                m = analysis["metrics"]
                recs = code_recommendation_engine.generate_recommendations(m, analysis["risk_score"], analysis["risk_level"])
                created = base_time + timedelta(days=i * 2, hours=3)
                rec = CodeAnalysisRecord(
                    file_name=item["file_name"],
                    file_type=analysis["file_type"],
                    file_size=analysis["file_size"],
                    source_code=item["code"],
                    loc=m["loc"],
                    code_lines=m["code_lines"],
                    blank_lines=m["blank_lines"],
                    comment_lines=m["comment_lines"],
                    functions_count=m["functions_count"],
                    classes_count=m["classes_count"],
                    comments_count=m["comments_count"],
                    cyclomatic_complexity=m["cyclomatic_complexity"],
                    if_statements=m["if_statements"],
                    loops_count=m["loops_count"],
                    switch_statements=m["switch_statements"],
                    risk_score=analysis["risk_score"],
                    risk_level=analysis["risk_level"],
                    confidence=analysis["confidence"],
                    metrics_breakdown=m,
                    recommendations=recs,
                    created_at=created
                )
                db.add(rec)
            db.commit()
            print("Successfully seeded source code analysis records!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
