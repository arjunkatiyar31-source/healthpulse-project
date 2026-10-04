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
import java.util.*;

@WebServlet("/api/doctors")
public class DoctorServlet extends HttpServlet {

    private final Gson gson = new Gson();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json");
        List<Map<String, Object>> doctors = new ArrayList<>();

        String sql = "SELECT d.id, u.name, d.specialty " +
                     "FROM doctors d " +
                     "JOIN users u ON d.user_id = u.id " +
                     "ORDER BY u.name";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                Map<String, Object> doctor = new HashMap<>();
                doctor.put("id", rs.getInt("id"));
                doctor.put("name", rs.getString("name"));
                doctor.put("specialty", rs.getString("specialty"));
                doctors.add(doctor);
            }

            resp.setStatus(HttpServletResponse.SC_OK);
            resp.getWriter().write(gson.toJson(doctors));

        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write(gson.toJson(Map.of("message", "Server error: " + e.getMessage())));
            e.printStackTrace();
        }
    }
}