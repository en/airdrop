# airdrop
A massive airdrop tool

1. git clone https://github.com/en/airdrop.git
2. cd airdrop
3. npm install
4. npm install -g truffle
5. edit migrations/2_deploy_contracts.js, replace 0xfFF9C805F14E34664ADDC108a30BCC2034cA4a87 to your token contract address
6. truffle compile
7. modify truffle.js, add mainnet configuration
8. truffle migrate --network mainnet
9. modify the following lines in scripts/aridrop.js
```
const CONTRACT_ADDRESS = '0xe5203EE823962ca34b70F8a137c68894C869eFa8' // your airdrop contract address
const TOKEN_DECIMALS = 18
const RPC_URL = 'http://localhost:8545' 
const gas = 4500000
const gasPrice = 330 * Math.pow(10, 9) // 330 Gwei
await delay(90000)
```
10. fill in airdrop data in scripts/data/addrs.csv
11. npm run airdrop YOUR-WALLET-PRIVATE-KEY
