import chalk from 'chalk';



const majorVersion = parseInt(process.versions.node, 10);

if (majorVersion < 24) {
    console.error(chalk.bgRed.bold('ERROR'), "Incompatible Node.js version. Catalysta needs v24 or higher, but you're using", 'v' + majorVersion);
    process.exit(1);
}
console.log(chalk.bgGreen.bold('READY'), 'Node.js', 'v' + majorVersion);



const catalysta = {
    timeStamp() {
        const now = new Date();
        const pad = (num, size = 2) => String(num).padStart(size, '0');
        return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`;
    },
}



export default catalysta;