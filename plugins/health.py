class HealthAuditor:
    def __init__(self, auditor):
        self.auditor = auditor

    def run(self):
        """Perform basic health checks: status code, response time."""
        result = {}
        
        # 1. Fetch the URL
        if not self.auditor.fetch():
            result['status'] = 'Error'
            result['response_time_ms'] = -1
            return result

        # 2. Get status code
        status_code = self.auditor.get_status_code()
        result['status'] = status_code

        # 3. Get response time (ms)
        result['response_time_ms'] = self.auditor.get_response_time()

        # 4. Check for redirects
        if self.auditor.response.history:
            redirects = []
            for resp in self.auditor.response.history:
                redirects.append({
                    'status': resp.status_code,
                    'url': resp.url
                })
            result['redirects'] = redirects

        return result
