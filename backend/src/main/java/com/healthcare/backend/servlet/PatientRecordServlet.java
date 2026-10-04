package com.healthcare.backend.servlet;

import com.google.gson.Gson;
import com.healthcare.backend.util.DBConnection;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;

@WebServlet("/api/patients/*")
public class PatientRecordServlet extends HttpServlet {

    private final Gson gson = new Gson();

    // The frontend sends the logged-in user's own users.id in the URL.
    // The medical_records table needs patients.id instead, so translate here.
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

    // GET /api/patients/{id}/medical-records
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json");

        String pathInfo = req.getPathInfo(); // "/{id}/medical-records"
        if (pathInfo == null) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write(gson.toJson(Map.of("message", "Patient id required in URL")));
            return;
        }

        String[] parts = pathInfo.split("/"); // ["", "{id}", "medical-records"]
        if (parts.length < 3 || !parts[2].equals("medical-records")) {
            resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
            resp.getWriter().write(gson.toJson(Map.of("message", "Not found")));
            return;
        }

        int userId = Integer.parseInt(parts[1]);
        List<Map<String, Object>> records = new ArrayList<>();

        String sql = "SELECT mr.id, mr.record_date, mr.diagnosis, mr.prescription, du.name AS doctor_name " +
                     "FROM medical_records mr " +
                     "LEFT JOIN doctors d ON mr.doctor_id = d.id " +
                     "LEFT JOIN users du ON d.user_id = du.id " +
                     "WHERE mr.patient_id = ? " +
                     "ORDER BY mr.record_date DESC";

        try (Connection conn = DBConnection.getConnection()) {

            int actualPatientId = resolvePatientId(conn, userId);

            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setInt(1, actualPatientId);

                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        Map<String, Object> record = new HashMap<>();
                        record.put("id", rs.getInt("id"));
                        record.put("date", rs.getTimestamp("record_date").toString());
                        record.put("diagnosis", rs.getString("diagnosis"));
                        record.put("prescription", rs.getString("prescription"));
                        record.put("doctorName", rs.getString("doctor_name"));
                        records.add(record);
                    }
                }
            }

            resp.setStatus(HttpServletResponse.SC_OK);
            resp.getWriter().write(gson.toJson(records));

        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write(gson.toJson(Map.of("message", "Server error: " + e.getMessage())));
            e.printStackTrace();
        }
    }
}
