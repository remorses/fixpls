import { exec } from 'child_processx'
process.exit(0)



exec('tsc', (err, stdout, stderr) => {
    if (err) {
        console.error(err)
        return
    }
    console.log(stdout)
})
