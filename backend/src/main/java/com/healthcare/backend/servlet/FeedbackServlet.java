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
import java.util.*;

@WebServlet("/api/feedback")
public class FeedbackServlet extends HttpServlet {

    private final Gson gson = new Gson();

    private int parseIntSafe(Object value) {
        if (value instanceof Double) {
            return ((Double) value).intValue();
        } else if (value instanceof String) {
            return Integer.parseInt((String) value);
        }
        throw new IllegalArgumentException("Cannot parse value to int: " + value);
    }

    // Frontend sends the doctor's own users.id as "doctorId" — translate to doctors.id
    private int resolveDoctorId(Connection conn, int userId) throws SQLException {
        String sql = "SELECT id FROM doctors WHERE user_id = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) return rs.getInt("id");
            }
        }
        throw new SQLException("No doctor record found for user id " + userId);
    }

    // GET /api/feedback?doctorId=
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json");
        List<Map<String, Object>> feedbackList = new ArrayList<>();

        String doctorId = req.getParameter("doctorId");

        StringBuilder sql = new StringBuilder(
            "SELECT f.id, pu.name AS patient_name, f.rating, f.comment " +
            "FROM feedback f " +
            "JOIN patients p ON f.patient_id = p.id " +
            "JOIN users pu ON p.user_id = pu.id WHERE 1=1"
        );

        try (Connection conn = DBConnection.getConnection()) {

            Integer resolvedDoctorId = null;
            if (doctorId != null && !doctorId.isEmpty()) {
                resolvedDoctorId = resolveDoctorId(conn, Integer.parseInt(doctorId));
                sql.append(" AND f.doctor_id = ?");
            }
            sql.append(" ORDER BY f.created_at DESC");

            try (PreparedStatement stmt = conn.prepareStatement(sql.toString())) {
                if (resolvedDoctorId != null) {
                    stmt.setInt(1, resolvedDoctorId);
                }

                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        Map<String, Object> fb = new HashMap<>();
                        fb.put("id", rs.getInt("id"));
                        fb.put("patientName", rs.getString("patient_name"));
                        fb.put("rating", rs.getInt("rating"));
                        fb.put("comment", rs.getString("comment"));
                        feedbackList.add(fb);
                    }
                }
            }

            resp.setStatus(HttpServletResponse.SC_OK);
            resp.getWriter().write(gson.toJson(feedbackList));

        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write(gson.toJson(Map.of("message", "Server error: " + e.getMessage())));
            e.printStackTrace();
        }
    }

    // POST /api/feedback { doctorId, rating, comment }
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json");

        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = req.getReader()) {
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
        }
        Map<?, ?> body = gson.fromJson(sb.toString(), Map.class);

        // NOTE: the feedback POST contract only sends doctorId/rating/comment — no
        // patientId — so we can't identify which patient is submitting without
        // session/token-based user lookup. For this student project we default to
        // patient id 1 (patients.id, not users.id). In a production system this
        // would come from the authenticated user's session instead.
        String sql = "INSERT INTO feedback (doctor_id, patient_id, rating, comment) VALUES (?, ?, ?, ?)";

        try (Connection conn = DBConnection.getConnection()) {

            int rawDoctorUserId = parseIntSafe(body.get("doctorId"));
            int actualDoctorId = resolveDoctorId(conn, rawDoctorUserId);

            try (PreparedStatement stmt = conn.prepareStatement(sql, PreparedStatement.RETURN_GENERATED_KEYS)) {
                stmt.setInt(1, actualDoctorId);
                stmt.setInt(2, 1); // default patients.id — see note above
                stmt.setInt(3, parseIntSafe(body.get("rating")));
                stmt.setString(4, (String) body.get("comment"));
                stmt.executeUpdate();

                int newId;
                try (ResultSet keys = stmt.getGeneratedKeys()) {
                    keys.next();
                    newId = keys.getInt(1);
                }

                resp.setStatus(HttpServletResponse.SC_CREATED);
                resp.getWriter().write(gson.toJson(Map.of("id", newId, "message", "Feedback submitted successfully")));
            }

        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write(gson.toJson(Map.of("message", "Server error: " + e.getMessage())));
            e.printStackTrace();
        }
    }
}