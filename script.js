window.onload = () => {
    const params = (new URL(window.location.href)).searchParams;
    const paramUserList = params.has('userList') ? params.get('userList') : ''
    const paramTaskList = params.has('taskList') ? params.get('taskList') : ''
    const paramLimitTime = params.has('limitTime') ? params.get('limitTime') : 600

    reflectQuery(paramUserList, paramTaskList, paramLimitTime)

    const userList = loadUserList(paramUserList)
    const taskList = loadTaskList(paramTaskList)

    makeTable(userList, taskList)

    setTimeout(updateStatus, 1, userList, taskList, paramLimitTime)
    setInterval(updateStatus, 60 * 1000, userList, taskList, paramLimitTime)
}

function reflectQuery(userList, taskList, limitTime) {
    document.getElementById('userList').innerHTML = userList
    document.getElementById('taskList').innerHTML = taskList
    document.getElementById('limitTime').value = limitTime
}

function loadUserList(paramUserList) {
    let res = []
    for (let user of paramUserList.split('\n')) {
        user = user.trim()
        if (user == '') continue
        res.push(user)
    }
    return res
}

function loadTaskList(paramTaskList) {
    let res = []
    for (let task of paramTaskList.split('\n')) {
        if (task.trim() == '') continue
        if (task.includes(',')) {
            const taskName = task.split(',')[0].trim()
            const taskUrl = task.split(',')[1].trim()
            res.push({
                taskName: taskName,
                taskUrl: taskUrl,
            })
        }
        else {
            const taskUrl = task.trim()
            res.push({
                taskName: getTaskId(taskUrl),
                taskUrl: taskUrl,
            })
        }
    }
    return res
}

function getTaskId(url) {
    const tmp = url.split('/')
    return tmp[tmp.length - 1]
}

function getContestId(url) {
    const tmp = url.split('/')
    return tmp[tmp.length - 3]
}

function makeTable(userList, taskList) {
    const tHeader = document.getElementById('taskTableHeader')
    for (const task of taskList) {
        const th = document.createElement('th')
        th.style = 'text-align: center'
        th.innerHTML += `<a href="${task.taskUrl}" target="_blank">${task.taskName}</a>`
        tHeader.appendChild(th)
    }
    const tBody = document.getElementById('taskTableBody')
    for (const user of userList) {
        const tr = document.createElement('tr')
        const tdUser = document.createElement('td')
        tdUser.innerHTML = `<a href="https://kenkoooo.com/atcoder/#/user/${user}?userPageTab=Submissions" target="_blank">${user}</a>`
        tr.appendChild(tdUser)
        for (const task of taskList) {
            const td = document.createElement('td')
            td.style = 'text-align: center'
            td.innerHTML = `<a href="https://atcoder.jp/contests/${getContestId(task.taskUrl)}/submissions?f.Task=${getTaskId(task.taskUrl)}&f.LanguageName=&f.Status=&f.User=${user}" target="_blank""></a>`
            tr.appendChild(td)
        }
        tBody.appendChild(tr)
    }
}

function updateStatus(userList, taskList, paramLimitTime) {
    for (let i = 0; i < userList.length; i++) {
        const user = userList[i]
        new Promise((resolve, reject) => {
            resolve(downloadSubmissions(user))
        }).then((submissions) => {
            for (let j = 0; j < taskList.length; j++) {
                const task = taskList[j]
                const td = document.getElementById('taskTableBody').children[i].children[1 + j]
                let status = 0
                let firstTime = 1000000000000000000
                let lastTime = 0
                for (const submission of submissions) {
                    if (submission['problem_id'] != getTaskId(task.taskUrl)) continue
                    status = Math.max(status, submission['result'] == 'AC' ? 2 : 1)
                    firstTime = Math.min(firstTime, submission['epoch_second'])
                    lastTime = Math.max(lastTime, submission['epoch_second'])
                }
                const fisrtTimeD = new Date(0)
                fisrtTimeD.setUTCSeconds(firstTime)
                const lastTimeD = new Date(0)
                lastTimeD.setUTCSeconds(lastTime)
                const now = new Date()
                const elapsedTime = now - fisrtTimeD
                td.classList.remove('table-warning', 'table-success', 'table-danger')
                if (status == 0) {
                    td.children[0].innerHTML = '-'
                }
                if (status == 1) {
                    td.children[0].innerHTML = `x<div class="text-muted" style="font-size: 0.6rem;">${getTimeD(fisrtTimeD)}</div><div class="text-muted" style="font-size: 0.6rem;">${getTimeD(lastTimeD)}</div>`
                    if (elapsedTime >= paramLimitTime * 1000) td.classList.add('table-danger')
                    else td.classList.add('table-warning')

                }
                if (status == 2) {
                    td.children[0].innerHTML = `o<div class="text-muted" style="font-size: 0.6rem;">${getTimeD(fisrtTimeD)}</div><div class="text-muted" style="font-size: 0.6rem;">${getTimeD(lastTimeD)}</div>`
                    td.classList.add('table-success')
                }
            }
        });
    }
}

function getTimeD(date) {
    return ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2)
}

function getTime(t) {
    return Math.floor(t / 3600) + 'h ' + ('0' + Math.floor(t / 60) % 60).slice(-2) + 'm ' + ('0' + t % 60).slice(-2) + 's'
}

async function downloadSubmissions(userId) {
    let second = 0;
    let submissions = [];
    while (true) {
        let req = new XMLHttpRequest();
        req.open("GET", `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${userId}&from_second=${second}`, false);
        req.send(null);
        let tmp = JSON.parse(req.responseText);
        submissions = submissions.concat(tmp);
        if (tmp.length < 500) break;
        else second = tmp.slice(-1)[0]['epoch_second'];
    }
    return submissions;
}
