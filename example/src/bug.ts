import { exec } from 'child_process';

exec('tsc', (err, stdout, stderr) => {
    if (err) {
        console.error(err)
        return
    }
    console.log(stdout)
})


