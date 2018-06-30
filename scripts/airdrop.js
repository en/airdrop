const fs = require('fs')
const path = require('path')

const Papa = require('papaparse')
const Contract = require('truffle-contract')
const Web3 = require('web3')
const EthereumWallet = require('ethereumjs-wallet')
const EthereumTx = require('ethereumjs-tx')

const ProviderEngine = require('web3-provider-engine')
// const CacheSubprovider = require('web3-provider-engine/subproviders/cache.js')
const FixtureSubprovider = require('web3-provider-engine/subproviders/fixture.js')
const FilterSubprovider = require('web3-provider-engine/subproviders/filters.js')
// const VmSubprovider = require('web3-provider-engine/subproviders/vm.js')
const HookedWalletSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js')
// const NonceSubprovider = require('web3-provider-engine/subproviders/nonce-tracker.js')
const RpcSubprovider = require('web3-provider-engine/subproviders/rpc.js')

const CSV_PATH = path.resolve(__dirname, 'data', 'addrs.csv')
const CONTRACT_PATH = path.resolve(
  __dirname,
  '..',
  'build',
  'contracts',
  'Airdrop.json'
)
const BATCH_SIZE = 100
const CONTRACT_ADDRESS = '0xe5203EE823962ca34b70F8a137c68894C869eFa8'
const RPC_URL = 'http://localhost:8545'
// const RPC_URL = 'https://mainnet.infura.io/API_KEY'
// const RPC_URL = 'https://ropsten.infura.io/API_KEY'

const privateKey = process.argv.slice(2)[0]
const privateKeyBuffer = new Buffer(privateKey, 'hex')
const myWallet = EthereumWallet.fromPrivateKey(privateKeyBuffer)
console.log(myWallet.getAddressString())

const engine = new ProviderEngine()
const web3 = new Web3(engine)

// static results
engine.addProvider(
  new FixtureSubprovider({
    web3_clientVersion: 'ProviderEngine/v0.0.0/javascript',
    net_listening: true,
    eth_hashrate: '0x00',
    eth_mining: false,
    eth_syncing: true
  })
)

// cache layer
// engine.addProvider(new CacheSubprovider())

// filters
engine.addProvider(new FilterSubprovider())

// pending nonce
// engine.addProvider(new NonceSubprovider())

// vm
// engine.addProvider(new VmSubprovider())

// id mgmt
engine.addProvider(
  new HookedWalletSubprovider({
    getAccounts: function(cb) {
      cb(null, [myWallet.getAddressString()])
    },
    signTransaction: function(txParams, cb) {
      const privateKey = myWallet.getPrivateKey()
      const tx = new EthereumTx(txParams)
      tx.sign(privateKey)
      const hexTx = '0x' + tx.serialize().toString('hex')
      cb(null, hexTx)
    }
  })
)

// data source
engine.addProvider(
  new RpcSubprovider({
    rpcUrl: RPC_URL
  })
)

// log new blocks
engine.on('block', function(block) {
  console.log('================================')
  console.log(
    'BLOCK CHANGED:',
    '#' + block.number.toString('hex'),
    '0x' + block.hash.toString('hex')
  )
  console.log('================================')
})

// network connectivity error
engine.on('error', function(err) {
  // report connectivity errors
  console.error(err.stack)
})

// start polling for blocks
engine.start()

Papa.parsePromise = function(path) {
  const data = []
  let addrs = []
  let tokens = []
  let n = 0
  return new Promise(function(resolve, reject) {
    Papa.parse(fs.createReadStream(path, 'utf8'), {
      step: function(row) {
        const addr = row.data[0][0]
        const amount = parseInt(row.data[0][1]) * Math.pow(10, 18)
        const isAddress = web3.utils.isAddress(addr)

        if (isAddress) {
          addrs.push(addr)
          tokens.push(amount)
          n++

          if (n >= BATCH_SIZE) {
            data.push([addrs, tokens])
            addrs = []
            tokens = []
            n = 0
          }
        }
      },
      error: function(err) {
        reject(err)
      },
      complete: function() {
        if (addrs.length > 0) {
          data.push([addrs, tokens])
          addrs = []
          tokens = []
          n = 0
        }
        resolve(data)
      }
    })
  })
}

fs.readFilePromise = function(path) {
  return new Promise(function(resolve, reject) {
    fs.readFile(path, 'utf-8', function(err, data) {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

Papa.parsePromise(CSV_PATH).then(
  function(csv) {
    fs.readFilePromise(CONTRACT_PATH).then(
      function(contractFile) {
        const Airdrop = Contract(JSON.parse(contractFile))
        Airdrop.setProvider(engine)
        Airdrop.at(CONTRACT_ADDRESS).then(airdropContract => {
          ;(async function loop() {
            const gas = 4500000
            const gasPrice = 330 * Math.pow(10, 9)
            for (let i = 0; i < csv.length; i++) {
              console.log('airdrop:', csv[i][0])
              try {
                await airdropContract.deliverTokens(csv[i][0], csv[i][1], {
                  from: myWallet.getAddressString(),
                  gas: gas,
                  gasPrice: gasPrice
                })
                await delay(90000)
              } catch (err) {
                console.log('error:', err)
              }
            }
          })()
        })
      },
      function(err) {
        console.log(err)
      }
    )
  },
  function(err) {
    console.log(err)
  }
)
