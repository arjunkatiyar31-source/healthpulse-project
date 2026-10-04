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
import java.util.HashMap;
import java.util.Map;

@WebServlet("/api/settings")
public class SettingsServlet extends HttpServlet {

    private final Gson gson = new Gson();

    // GET /api/settings -> { key: value, ... }
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json");
        Map<String, String> settings = new HashMap<>();

        String sql = "SELECT setting_key, setting_value FROM settings";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                settings.put(rs.getString("setting_key"), rs.getString("setting_value"));
            }

            resp.setStatus(HttpServletResponse.SC_OK);
            resp.getWriter().write(gson.toJson(settings));

        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write(gson.toJson(Map.of("message", "Server error: " + e.getMessage())));
            e.printStackTrace();
        }
    }

    // PUT /api/settings { key: value, ... } -> upsert each key
    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json");

        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = req.getReader()) {
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
        }
        Map<?, ?> body = gson.fromJson(sb.toString(), Map.class);

        String sql = "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) " +
                     "ON DUPLICATE KEY UPDATE setting_value = ?";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            for (Map.Entry<?, ?> entry : body.entrySet()) {
                stmt.setString(1, String.valueOf(entry.getKey()));
                stmt.setString(2, String.valueOf(entry.getValue()));
                stmt.setString(3, String.valueOf(entry.getValue()));
                stmt.addBatch();
            }
            stmt.executeBatch();

            resp.setStatus(HttpServletResponse.SC_OK);
            resp.getWriter().write(gson.toJson(Map.of("message", "Settings updated successfully")));

        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write(gson.toJson(Map.of("message", "Server error: " + e.getMessage())));
            e.printStackTrace();
        }
    }
}