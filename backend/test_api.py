"""Integration test using a temporary SQLite database and a real HTTP server."""
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen


class TaskApiTest(unittest.TestCase):
    def test_task_lifecycle_and_persistence(self):
        with tempfile.TemporaryDirectory() as folder:
            with socket.socket() as sock:
                sock.bind(('127.0.0.1', 0))
                port = sock.getsockname()[1]
            env = {**os.environ, 'TODO_DB': str(Path(folder) / 'test.db')}
            command = [sys.executable, '-m', 'uvicorn', 'backend.main:app', '--port', str(port)]
            process = None

            def request(path='', method='GET', body=None):
                data = json.dumps(body).encode() if body is not None else None
                req = Request(f'http://127.0.0.1:{port}/api/tasks{path}', data=data, method=method, headers={'Content-Type': 'application/json'})
                with urlopen(req, timeout=3) as response:
                    return json.loads(response.read()) if response.status != 204 else None

            def start():
                server = subprocess.Popen(command, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                for _ in range(100):
                    try:
                        request()
                        return server
                    except OSError:
                        time.sleep(.1)
                server.terminate()
                server.wait()
                self.fail('Server did not start')

            try:
                process = start()
                self.assertEqual(request(), [])
                with self.assertRaises(HTTPError) as invalid:
                    request(method='POST', body={'title': '   '})
                self.assertEqual(invalid.exception.code, 422)
                first = request(method='POST', body={'title': ' First task '})
                second = request(method='POST', body={'title': 'Second task'})
                self.assertEqual(first['title'], 'First task')
                request('/' + str(first['id']), 'PATCH', {'completed': True, 'title': 'Edited task'})
                request('/order', 'PUT', {'ids': [second['id'], first['id']]})
                with self.assertRaises(HTTPError) as conflict:
                    request('/order', 'PUT', {'ids': [first['id'], first['id']]})
                self.assertEqual(conflict.exception.code, 409)
                process.terminate()
                process.wait()
                process = start()
                saved = request()
                self.assertEqual([t['id'] for t in saved], [second['id'], first['id']])
                self.assertTrue(saved[1]['completed'])
                self.assertEqual(saved[1]['title'], 'Edited task')
                request('/' + str(first['id']), 'DELETE')
                self.assertEqual(len(request()), 1)
                with self.assertRaises(HTTPError) as missing:
                    request('/999999', 'PATCH', {'completed': True})
                self.assertEqual(missing.exception.code, 404)
            finally:
                if process is not None:
                    process.terminate()
                    process.wait()


if __name__ == '__main__':
    unittest.main()
