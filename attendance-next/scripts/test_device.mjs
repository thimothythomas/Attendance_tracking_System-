import ZKLib from 'node-zklib'

async function run() {
  console.log('Connecting directly to biometric device at 192.168.1.6:4370...')
  const zk = new ZKLib('192.168.1.6', 4370, 10000, 4000)
  
  try {
    await zk.createSocket()
    console.log(' Successfully connected to biometric device!\n')

    const info = await zk.getInfo()
    console.log('=== Device Status ===')
    console.log(`- Registered Users on Device: ${info.userCounts}`)
    console.log(`- Total Stored Punch Logs:    ${info.logCounts}`)
    console.log(`- Device Capacity:            ${info.logCapacity}\n`)

    const users = await zk.getUsers()
    console.log('=== Registered Users Sample ===')
    users.data.slice(0, 5).forEach(u => {
      console.log(`  ID: ${u.userId.padEnd(4)} | Name: ${u.name}`)
    })

    const logs = await zk.getAttendances()
    console.log(`\n=== Total Attendance Records: ${logs.data.length} ===`)
    console.log('Latest 5 punches directly from machine:')
    logs.data.slice(-5).forEach(log => {
      console.log(`  User ID: ${log.deviceUserId.padEnd(4)} | Time: ${new Date(log.recordTime).toLocaleString()}`)
    })

  } catch (err) {
    console.error('Connection failed:', err.message)
  } finally {
    try { await zk.disconnect() } catch {}
    process.exit(0)
  }
}

run()
