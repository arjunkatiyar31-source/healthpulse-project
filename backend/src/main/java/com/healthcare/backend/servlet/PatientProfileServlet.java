package com.healthcare.backend.servlet;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.healthcare.backend.util.DBConnection;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.BufferedReader;
import java.io.IOException;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.Map;

@WebServlet("/api/patient-profile/*")
public class PatientProfileServlet extends HttpServlet {

    // serializeNulls so empty fields arrive as null (not missing) in the frontend
    private final Gson gson = new GsonBuilder().serializeNulls().create();

    private void writeJson(HttpServletResponse resp, int status, Object payload) throws IOException {
        resp.setContentType("application/json");
        resp.setStatus(status);
        resp.getWriter().write(gson.toJson(payload));
    }

    // The frontend sends the logged-in user's users.id in the URL
    private int userIdFromPath(HttpServletRequest req) {
        String pathInfo = req.getPathInfo();
        if (pathInfo == null || pathInfo.equals("/")) {
            throw new IllegalArgumentException("User id required in URL");
        }
        return Integer.parseInt(pathInfo.substring(1));
    }

    // Blank strings become null
    private String text(Object value) {
        if (value == null) return null;
        String s = String.valueOf(value).trim();
        return s.isEmpty() ? null : s;
    }

    private Double number(Object value) {
        if (value == null) return null;
        if (value instanceof Number) return ((Number) value).doubleValue();
        String s = String.valueOf(value).trim();
        return s.isEmpty() ? null : Double.parseDouble(s);
    }

    private void setText(PreparedStatement stmt, int index, String value) throws SQLException {
        if (value != null) stmt.setString(index, value);
        else stmt.setNull(index, Types.VARCHAR);
    }

    // GET /api/patient-profile/{userId}
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        int userId;
        try {
            userId = userIdFromPath(req);
        } catch (Exception e) {
            writeJson(resp, HttpServletResponse.SC_BAD_REQUEST, Map.of("message", "Valid user id required in URL"));
            return;
        }

        String sql = "SELECT u.name, u.email, p.date_of_birth, p.gender, p.blood_group, " +
                     "p.height_cm, p.weight_kg, p.contact, p.address, p.allergies, " +
                     "p.chronic_conditions, p.emergency_contact_name, p.emergency_contact_phone " +
                     "FROM users u JOIN patients p ON p.user_id = u.id WHERE u.id = ?";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, userId);

            try (ResultSet rs = stmt.executeQuery()) {
                if (!rs.next()) {
                    writeJson(resp, HttpServletResponse.SC_NOT_FOUND,
                            Map.of("message", "No patient profile found for user id " + userId));
                    return;
                }

                Map<String, Object> profile = new HashMap<>();
                profile.put("userId", userId);
                profile.put("name", rs.getString("name"));
                profile.put("email", rs.getString("email"));

                Date dob = rs.getDate("date_of_birth");
                profile.put("dateOfBirth", dob != null ? dob.toString() : null);
                // Age is calculated, never stored, so it can't go stale
                profile.put("age", dob != null ? Period.between(dob.toLocalDate(), LocalDate.now()).getYears() : null);

                profile.put("gender", rs.getString("gender"));
                profile.put("bloodGroup", rs.getString("blood_group"));

                BigDecimal height = rs.getBigDecimal("height_cm");
                BigDecimal weight = rs.getBigDecimal("weight_kg");
                profile.put("heightCm", height != null ? height.doubleValue() : null);
                profile.put("weightKg", weight != null ? weight.doubleValue() : null);

                profile.put("contact", rs.getString("contact"));
                profile.put("address", rs.getString("address"));
                profile.put("allergies", rs.getString("allergies"));
                profile.put("chronicConditions", rs.getString("chronic_conditions"));
                profile.put("emergencyContactName", rs.getString("emergency_contact_name"));
                profile.put("emergencyContactPhone", rs.getString("emergency_contact_phone"));

                writeJson(resp, HttpServletResponse.SC_OK, profile);
            }

        } catch (Exception e) {
            writeJson(resp, HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    Map.of("message", "Server error: " + e.getMessage()));
            e.printStackTrace();
        }
    }

    // PUT /api/patient-profile/{userId}
    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        int userId;
        try {
            userId = userIdFromPath(req);
        } catch (Exception e) {
            writeJson(resp, HttpServletResponse.SC_BAD_REQUEST, Map.of("message", "Valid user id required in URL"));
            return;
        }

        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = req.getReader()) {
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
        }
        Map<?, ?> body = gson.fromJson(sb.toString(), Map.class);
        if (body == null) {
            writeJson(resp, HttpServletResponse.SC_BAD_REQUEST, Map.of("message", "Request body required"));
            return;
        }

        LocalDate dob = null;
        Double height;
        Double weight;
        try {
            String dobText = text(body.get("dateOfBirth"));
            if (dobText != null) {
                dob = LocalDate.parse(dobText);
                if (dob.isAfter(LocalDate.now())) {
                    writeJson(resp, HttpServletResponse.SC_BAD_REQUEST,
                            Map.of("message", "Date of birth cannot be in the future"));
                    return;
                }
            }
            height = number(body.get("heightCm"));
            weight = number(body.get("weightKg"));
        } catch (DateTimeParseException | NumberFormatException e) {
            writeJson(resp, HttpServletResponse.SC_BAD_REQUEST,
                    Map.of("message", "Invalid date or number in request"));
            return;
        }

        if (height != null && (height < 30 || height > 300)) {
            writeJson(resp, HttpServletResponse.SC_BAD_REQUEST,
                    Map.of("message", "Height must be between 30 and 300 cm"));
            return;
        }
        if (weight != null && (weight < 1 || weight > 500)) {
            writeJson(resp, HttpServletResponse.SC_BAD_REQUEST,
                    Map.of("message", "Weight must be between 1 and 500 kg"));
            return;
        }

        String sql = "UPDATE patients SET date_of_birth = ?, gender = ?, blood_group = ?, " +
                     "height_cm = ?, weight_kg = ?, contact = ?, address = ?, allergies = ?, " +
                     "chronic_conditions = ?, emergency_contact_name = ?, emergency_contact_phone = ? " +
                     "WHERE user_id = ?";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            if (dob != null) stmt.setDate(1, Date.valueOf(dob));
            else stmt.setNull(1, Types.DATE);

            setText(stmt, 2, text(body.get("gender")));
            setText(stmt, 3, text(body.get("bloodGroup")));

            if (height != null) stmt.setDouble(4, height);
            else stmt.setNull(4, Types.DECIMAL);
            if (weight != null) stmt.setDouble(5, weight);
            else stmt.setNull(5, Types.DECIMAL);

            setText(stmt, 6, text(body.get("contact")));
            setText(stmt, 7, text(body.get("address")));
            setText(stmt, 8, text(body.get("allergies")));
            setText(stmt, 9, text(body.get("chronicConditions")));
            setText(stmt, 10, text(body.get("emergencyContactName")));
            setText(stmt, 11, text(body.get("emergencyContactPhone")));
            stmt.setInt(12, userId);

            int updated = stmt.executeUpdate();
            if (updated == 0) {
                writeJson(resp, HttpServletResponse.SC_NOT_FOUND,
                        Map.of("message", "No patient profile found for user id " + userId));
                return;
            }

            writeJson(resp, HttpServletResponse.SC_OK, Map.of("message", "Patient profile updated successfully"));

        } catch (Exception e) {
            writeJson(resp, HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    Map.of("message", "Server error: " + e.getMessage()));
            e.printStackTrace();
        }
    }
}