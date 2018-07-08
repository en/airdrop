const fs = require('fs')
const path = require('path')
const util = require('util')

const Papa = require('papaparse')
const contract = require('truffle-contract')
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

const readFile = util.promisify(fs.readFile)

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
const TOKEN_DECIMALS = 18
const RPC_URL = 'http://localhost:8545'

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
  let receivers = []
  let tokens = []
  let n = 0
  return new Promise(function(resolve, reject) {
    Papa.parse(fs.createReadStream(path, 'utf8'), {
      step: function(row) {
        const receiver = row.data[0][0]
        const amount = parseInt(row.data[0][1]) * Math.pow(10, TOKEN_DECIMALS)
        const isAddress = web3.utils.isAddress(receiver)

        if (isAddress) {
          receivers.push(receiver)
          tokens.push(amount)
          n++

          if (n >= BATCH_SIZE) {
            data.push([receivers, tokens])
            receivers = []
            tokens = []
            n = 0
          }
        }
      },
      error: function(err) {
        reject(err)
      },
      complete: function() {
        if (receivers.length > 0) {
          data.push([receivers, tokens])
          receivers = []
          tokens = []
          n = 0
        }
        resolve(data)
      }
    })
  })
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const main = async () => {
  const csvData = await Papa.parsePromise(CSV_PATH)
  const contractFile = await readFile(CONTRACT_PATH, 'utf-8')
  const airdrop = contract(JSON.parse(contractFile))
  airdrop.setProvider(engine)
  const airdropContract = await airdrop.at(CONTRACT_ADDRESS)
  const gas = 4500000
  const gasPrice = 330 * Math.pow(10, 9)
  for (let i = 0; i < csvData.length; i++) {
    console.log('airdrop:', csvData[i][0])
    try {
      await airdropContract.deliverTokens(csvData[i][0], csvData[i][1], {
        from: myWallet.getAddressString(),
        gas: gas,
        gasPrice: gasPrice
      })
      await delay(90000)
    } catch (err) {
      console.log('error:', err)
    }
  }
}

main()
