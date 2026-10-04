package com.healthcare.backend.servlet;

import com.google.gson.Gson;
import com.healthcare.backend.util.DBConnection;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.BufferedReader;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Map;

@WebServlet("/api/medical-records")
public class MedicalRecordServlet extends HttpServlet {

    private final Gson gson = new Gson();

    private int parseIntSafe(Object value) {
        if (value instanceof Double) {
            return ((Double) value).intValue();
        } else if (value instanceof String) {
            return Integer.parseInt((String) value);
        }
        throw new IllegalArgumentException("Cannot parse value to int: " + value);
    }

    private int resolvePatientId(Connection conn, int userId) throws SQLException {
        String sql = "SELECT id FROM patients WHERE user_id = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("id");
                }
            }
        }
        throw new SQLException("No patient record found for user id " + userId);
    }

    // POST /api/medical-records { patientId, diagnosis, prescription }
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json");

        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = req.getReader()) {
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
        }
        Map<?, ?> body = gson.fromJson(sb.toString(), Map.class);

        String sql = "INSERT INTO medical_records (patient_id, diagnosis, prescription) VALUES (?, ?, ?)";

        try (Connection conn = DBConnection.getConnection()) {

            int rawUserId = parseIntSafe(body.get("patientId"));
            int actualPatientId = resolvePatientId(conn, rawUserId);

            try (PreparedStatement stmt = conn.prepareStatement(sql, PreparedStatement.RETURN_GENERATED_KEYS)) {
                stmt.setInt(1, actualPatientId);
                stmt.setString(2, (String) body.get("diagnosis"));
                stmt.setString(3, (String) body.get("prescription"));
                stmt.executeUpdate();

                int newId;
                try (ResultSet keys = stmt.getGeneratedKeys()) {
                    keys.next();
                    newId = keys.getInt(1);
                }

                resp.setStatus(HttpServletResponse.SC_CREATED);
                resp.getWriter().write(gson.toJson(Map.of("id", newId, "message", "Medical record added successfully")));
            }

        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write(gson.toJson(Map.of("message", "Server error: " + e.getMessage())));
            e.printStackTrace();
        }
    }
}