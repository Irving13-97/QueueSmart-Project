const response = await fetch(
  'http://localhost:3000/api/queues/1/leave/1',
  {
    method: 'DELETE'
  }
);

console.log('Status:', response.status);
console.log(await response.json());

// const response = await fetch(
//   'http://localhost:3000/api/queues/1/join',
//   {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//       customerName: 'Alex'
//     })
//   }
// );

// console.log('Status:', response.status);
// console.log(await response.json());


// const response = await fetch('http://localhost:3000/api/services/1', {
//   method: 'PUT',
//   headers: {
//     'Content-Type': 'application/json'
//   },
//   body: JSON.stringify({
//     name: 'Express Oil Change Plus',
//     description: 'An upgraded quick oil change service',
//     duration: 20,
//     priority: 'high'
//   })
// });

// const data = await response.json();

// console.log('Status:', response.status);
// console.log(data);
