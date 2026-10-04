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

@WebServlet("/api/appointments/*")
public class AppointmentServlet extends HttpServlet {

    private final Gson gson = new Gson();

    private int parseIntSafe(Object value) {
        if (value instanceof Double) {
            return ((Double) value).intValue();
        } else if (value instanceof String) {
            return Integer.parseInt((String) value);
        }
        throw new IllegalArgumentException("Cannot parse value to int: " + value);
    }

    // Frontend sends the logged-in user's own users.id as "patientId"/"doctorId".
    // These tables need patients.id / doctors.id instead, so translate here.
    private int resolvePatientId(Connection conn, int userId) throws SQLException {
        String sql = "SELECT id FROM patients WHERE user_id = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) return rs.getInt("id");
            }
        }
        throw new SQLException("No patient record found for user id " + userId);
    }

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

    // GET /api/appointments?doctorId=&patientId=
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json");
        List<Map<String, Object>> appointments = new ArrayList<>();

        String doctorId = req.getParameter("doctorId");
        String patientId = req.getParameter("patientId");

        StringBuilder sql = new StringBuilder(
            "SELECT a.id, a.doctor_id, du.name AS doctor_name, a.patient_id, pu.name AS patient_name, " +
            "a.appointment_date, a.appointment_time, a.status, a.notes " +
            "FROM appointments a " +
            "JOIN doctors d ON a.doctor_id = d.id " +
            "JOIN users du ON d.user_id = du.id " +
            "JOIN patients p ON a.patient_id = p.id " +
            "JOIN users pu ON p.user_id = pu.id WHERE 1=1"
        );

        List<Object> params = new ArrayList<>();

        try (Connection conn = DBConnection.getConnection()) {

            if (doctorId != null && !doctorId.isEmpty()) {
                int resolvedDoctorId = resolveDoctorId(conn, Integer.parseInt(doctorId));
                sql.append(" AND a.doctor_id = ?");
                params.add(resolvedDoctorId);
            }
            if (patientId != null && !patientId.isEmpty()) {
                int resolvedPatientId = resolvePatientId(conn, Integer.parseInt(patientId));
                sql.append(" AND a.patient_id = ?");
                params.add(resolvedPatientId);
            }
            sql.append(" ORDER BY a.appointment_date, a.appointment_time");

            try (PreparedStatement stmt = conn.prepareStatement(sql.toString())) {
                for (int i = 0; i < params.size(); i++) {
                    stmt.setObject(i + 1, params.get(i));
                }

                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        Map<String, Object> appt = new HashMap<>();
                        appt.put("id", rs.getInt("id"));
                        appt.put("doctorId", rs.getInt("doctor_id"));
                        appt.put("doctorName", rs.getString("doctor_name"));
                        appt.put("patientId", rs.getInt("patient_id"));
                        appt.put("patientName", rs.getString("patient_name"));
                        appt.put("date", rs.getDate("appointment_date").toString());
                        appt.put("time", rs.getTime("appointment_time").toString());
                        appt.put("status", rs.getString("status"));
                        appt.put("notes", rs.getString("notes"));
                        appointments.add(appt);
                    }
                }
            }

            resp.setStatus(HttpServletResponse.SC_OK);
            resp.getWriter().write(gson.toJson(appointments));

        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write(gson.toJson(Map.of("message", "Server error: " + e.getMessage())));
            e.printStackTrace();
        }
    }

    // POST /api/appointments { doctorId, patientId, date, time }
    @Override
        protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json");

        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = req.getReader()) {
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
        }
        Map<?, ?> body = gson.fromJson(sb.toString(), Map.class);

        String sql = "INSERT INTO appointments (doctor_id, patient_id, appointment_date, appointment_time, status) VALUES (?, ?, ?, ?, 'PENDING')";

        try (Connection conn = DBConnection.getConnection()) {

            // doctorId comes from /api/doctors, which already returns doctors.id directly —
            // no translation needed here, unlike patientId (which is the logged-in user's users.id).
            int actualDoctorId = parseIntSafe(body.get("doctorId"));
            int rawPatientUserId = parseIntSafe(body.get("patientId"));
            int actualPatientId = resolvePatientId(conn, rawPatientUserId);

            try (PreparedStatement stmt = conn.prepareStatement(sql, PreparedStatement.RETURN_GENERATED_KEYS)) {
                stmt.setInt(1, actualDoctorId);
                stmt.setInt(2, actualPatientId);
                stmt.setString(3, (String) body.get("date"));
                stmt.setString(4, (String) body.get("time"));
                stmt.executeUpdate();

                int newId;
                try (ResultSet keys = stmt.getGeneratedKeys()) {
                    keys.next();
                    newId = keys.getInt(1);
                }

                resp.setStatus(HttpServletResponse.SC_CREATED);
                resp.getWriter().write(gson.toJson(Map.of("id", newId, "message", "Appointment booked successfully")));
            }

        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write(gson.toJson(Map.of("message", "Server error: " + e.getMessage())));
            e.printStackTrace();
        }
    }

    // PUT /api/appointments/{id} { date, time, status, notes }
    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json");

        String pathInfo = req.getPathInfo();
        if (pathInfo == null || pathInfo.equals("/")) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write(gson.toJson(Map.of("message", "Appointment id required in URL")));
            return;
        }
        int id = Integer.parseInt(pathInfo.substring(1));

        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = req.getReader()) {
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
        }
        Map<?, ?> body = gson.fromJson(sb.toString(), Map.class);

        List<String> setClauses = new ArrayList<>();
        List<Object> params = new ArrayList<>();

        if (body.get("date") != null) { setClauses.add("appointment_date = ?"); params.add(body.get("date")); }
        if (body.get("time") != null) { setClauses.add("appointment_time = ?"); params.add(body.get("time")); }
        if (body.get("status") != null) { setClauses.add("status = ?"); params.add(body.get("status")); }
        if (body.get("notes") != null) { setClauses.add("notes = ?"); params.add(body.get("notes")); }

        if (setClauses.isEmpty()) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write(gson.toJson(Map.of("message", "No fields to update")));
            return;
        }

        String sql = "UPDATE appointments SET " + String.join(", ", setClauses) + " WHERE id = ?";
        params.add(id);

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            for (int i = 0; i < params.size(); i++) {
                stmt.setObject(i + 1, params.get(i));
            }
            stmt.executeUpdate();

            resp.setStatus(HttpServletResponse.SC_OK);
            resp.getWriter().write(gson.toJson(Map.of("message", "Appointment updated successfully")));

        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write(gson.toJson(Map.of("message", "Server error: " + e.getMessage())));
            e.printStackTrace();
        }
    }

    // DELETE /api/appointments/{id}
    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json");

        String pathInfo = req.getPathInfo();
        if (pathInfo == null || pathInfo.equals("/")) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write(gson.toJson(Map.of("message", "Appointment id required in URL")));
            return;
        }
        int id = Integer.parseInt(pathInfo.substring(1));

        String sql = "DELETE FROM appointments WHERE id = ?";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, id);
            stmt.executeUpdate();

            resp.setStatus(HttpServletResponse.SC_OK);
            resp.getWriter().write(gson.toJson(Map.of("message", "Appointment deleted successfully")));

        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write(gson.toJson(Map.of("message", "Server error: " + e.getMessage())));
            e.printStackTrace();
        }
    }
}