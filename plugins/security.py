from urllib.parse import urlparse
import ssl
import socket
import datetime

class SecurityAuditor:
    def __init__(self, auditor):
        self.auditor = auditor
        self.url = auditor.url  # Use auditor's URL

    def run(self):
        """Check SSL certificate details."""
        results = {}
        
        try:
            parsed = urlparse(self.url)
            hostname = parsed.hostname
            port = parsed.port or 443
            
            if not hostname:
                results['ssl_error'] = "Invalid URL"
                return results

            context = ssl.create_default_context()
            with socket.create_connection((hostname, port), timeout=5) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    
                    if not cert:
                         results['ssl_error'] = "No certificate presented"
                         return results

                    # 'notAfter' format: 'Mar 15 12:00:00 2024 GMT'
                    expire_str = cert['notAfter']
                    expire_date = datetime.datetime.strptime(expire_str, "%b %d %H:%M:%S %Y GMT")
                    
                    # Calculate days remaining
                    delta = expire_date - datetime.datetime.utcnow()
                    
                    # Issuer format is tricky, let's just get Common Name (CN) if possible
                    issuer_dict = {}
                    for item in cert.get('issuer', ()):
                        for key, value in item:
                            issuer_dict[key] = value
                    
                    results['ssl_issuer'] = issuer_dict.get('commonName', 'Unknown')
                    results['ssl_expire_date'] = expire_str
                    results['ssl_days_remaining'] = delta.days
                    results['ssl_valid'] = delta.days > 0

        except Exception as e:
            results['ssl_error'] = str(e)
            results['ssl_valid'] = False

        return results
