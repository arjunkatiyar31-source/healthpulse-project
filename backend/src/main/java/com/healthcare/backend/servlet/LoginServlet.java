package com.healthcare.backend.servlet;

import com.google.gson.Gson;
import com.healthcare.backend.util.DBConnection;
import jakarta.servlet.ServletException;
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
import java.util.UUID;

@WebServlet("/api/auth/login")
public class LoginServlet extends HttpServlet {

    private final Gson gson = new Gson();
    private static final Map<String, Integer> TOKEN_STORE = new HashMap<>();

    static class LoginRequest {
        String email;
        String password;
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        resp.setContentType("application/json");

        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = req.getReader()) {
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
        }

        LoginRequest loginReq = gson.fromJson(sb.toString(), LoginRequest.class);

        String sql = "SELECT id, name, email, role FROM users WHERE email = ? AND password = ?";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, loginReq.email);
            stmt.setString(2, loginReq.password);

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    int userId = rs.getInt("id");
                    String name = rs.getString("name");
                    String role = rs.getString("role");

                    String token = UUID.randomUUID().toString();
                    TOKEN_STORE.put(token, userId);

                    Map<String, Object> response = new HashMap<>();
                    response.put("token", token);
                    response.put("role", role);
                    response.put("userId", userId);
                    response.put("name", name);

                    resp.setStatus(HttpServletResponse.SC_OK);
                    resp.getWriter().write(gson.toJson(response));
                } else {
                    resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    Map<String, String> error = new HashMap<>();
                    error.put("message", "Invalid email or password");
                    resp.getWriter().write(gson.toJson(error));
                }
            }
        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            Map<String, String> error = new HashMap<>();
            error.put("message", "Server error: " + e.getMessage());
            resp.getWriter().write(gson.toJson(error));
            e.printStackTrace();
        }
    }
}