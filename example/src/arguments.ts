

function fn({name, surname}) {
    console.log(name, surname);
}

const names = [{
    name: 'John',
    surname: 'Doe'
}]

for (let obj of names) {
    fn({name: obj.name, })
}