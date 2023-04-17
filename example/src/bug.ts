import { exec } from 'child_processx'


exec('tsc', (err, stdout, stderr) => {
    if (err) {
        console.error(err)
        return
    }
    console.log(stdout)
})
