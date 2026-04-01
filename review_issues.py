import subprocess, json
result = subprocess.run(['gh', 'issue', 'list', '--repo', 'ClawMeMaybe/cmmb', '--state', 'open', '--limit', '50', '--json', 'number,title,body,labels'], capture_output=True, text=True)
issues = json.loads(result.stdout)
for i in issues:
    num = i['number']
    title = i['title']
    body = (i['body'] or '')[:400]
    labels = ', '.join([l['name'] for l in i.get('labels', [])])
    print('=== #' + str(num) + ' ' + title)
    print('Labels: ' + labels)
    print('Body: ' + body[:350])
    print()
