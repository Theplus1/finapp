# OpenTelemetry & Netdata Tracing Setup

This guide explains how to use OpenTelemetry for distributed tracing with Netdata.

## Overview

The application uses **OpenTelemetry** for automatic distributed tracing, sending traces to **Netdata's OpenTelemetry plugin**. This provides:

- **Automatic HTTP request tracing** - Every request is traced automatically
- **Database query tracing** - MongoDB operations are tracked
- **Service dependency visualization** - See how services interact
- **Performance analysis** - Identify bottlenecks and slow operations
- **Error tracking** - Trace errors across the request lifecycle
- **Unified dashboard** - Traces, logs, and metrics all in Netdata

## Local Development

### 1. Ensure Netdata is Running

Make sure Netdata is running with OpenTelemetry plugin enabled:

```bash
# Check if Netdata is running
docker ps | grep netdata

# Or start it if needed
docker run -d --name netdata -p 19999:19999 netdata/netdata:latest
```

### 2. Run Your Application

```bash
npm run dev
```

The app will automatically send traces to Netdata (default: http://localhost:4317).

### 3. View Traces in Netdata

1. Open http://localhost:19999
2. Navigate to **Observability** → **Traces**
3. Select **finapp-server** service
4. View request traces and performance metrics

## Production Deployment

### Environment Variables

Set on your VPS:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
NODE_ENV=production
```

The deployment workflow already includes this configuration.

### Netdata Configuration

Ensure Netdata's OpenTelemetry plugin is enabled in `/etc/netdata/netdata.conf`:

```ini
[plugins]
    otel = yes
```

Configure the OTLP receiver in `/etc/netdata/otel.d/otel.conf`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
```

Then restart Netdata:

```bash
sudo systemctl restart netdata
```

## What Gets Traced Automatically

OpenTelemetry auto-instrumentation tracks:

- **HTTP Requests** - All incoming requests with method, URL, status code
- **HTTP Calls** - Outgoing HTTP requests (axios, fetch)
- **Database Operations** - MongoDB queries with operation type and duration
- **Redis Operations** - Cache operations
- **Async Operations** - Promises and async/await
- **Errors** - Exceptions with stack traces

## Trace Structure

Each trace shows:

```
Request Span
├── HTTP Handler Span
│   ├── Service Logic Span
│   │   ├── Database Query Span
│   │   └── External API Call Span
│   └── Response Processing Span
└── Middleware Spans
```

## Performance Metrics

View in Netdata:

- **Trace Duration** - Total request time
- **Span Duration** - Individual operation time
- **Error Rate** - Failed operations
- **Service Latency** - Average response time per service

## Accessing Traces

- **Local**: http://localhost:19999 (Netdata dashboard)
- **VPS**: http://your-vps-ip:19999 (Netdata dashboard)

## Troubleshooting

### Traces not appearing

1. Check Netdata is running: `docker ps | grep netdata`
2. Check Netdata logs: `docker logs netdata`
3. Verify OTLP endpoint is accessible: `curl http://localhost:4317`
4. Check app logs for tracing initialization message

### Disable tracing

Set environment variable:

```bash
OTEL_SDK_DISABLED=true
```

## Integration with Netdata

Everything is integrated in one place:

- **Logs** - Application logs (stdout/stderr)
- **Traces** - Request flow and performance
- **Metrics** - System and application metrics

All accessible from the Netdata dashboard.

## Next Steps

1. Ensure Netdata has OpenTelemetry plugin enabled
2. Deploy app with `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317`
3. View traces in Netdata dashboard
4. Identify performance bottlenecks
5. Optimize slow operations
