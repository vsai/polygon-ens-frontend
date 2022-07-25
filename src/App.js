import React, {useState, useEffect} from 'react';
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import { ethers } from 'ethers';
import contractAbi from './utils/contractABI.json';
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import { networks } from './utils/networks';

// Constants
const TWITTER_HANDLE = 'vsai12';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const tld = "ysm";
const CONTRACT_ADDRESS = "0x726A35006E7C763004a2557FF581e81E39faB77F";

const App = () => {
  const [mints, setMints] = useState([]);
  const [currentAccount, setCurrentAccount] = useState("");
  const [domain, setDomain] = useState("");
  const [record, setRecord] = useState("");
  const [network, setNetwork] = useState('');

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        alert("Download metamask");
        return;
      }

      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      setCurrentAccount(accounts[0]);
    } catch(error) {
      console.error(error);
    }
  }

  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window;

    if (!ethereum) {
      console.log("Please install metamask");
      return
    }
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    if (accounts.length !== 0) {
      const account = accounts[0];
      setCurrentAccount(account);
    } else {
      console.log("No authorized account");
    }

    const chainId = await ethereum.request({ method: 'eth_chainId' });
    setNetwork(networks[chainId]);

    ethereum.on('chainChanged', handleChainChanged);

    // Reload the page when they change networks
    function handleChainChanged(_chainId) {
      window.location.reload();
    }
  }

  const fetchMints = async () => {
    const { ethereum } = window;
    if (!ethereum) {
      console.log("Install metamask");
      return
    }
    try {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

      console.log("getting all names");
      const names = await contract.getAllNames();
      console.log("got all names");

      const mintRecords = await Promise.all(names.map(async (name, index) => {
        console.log("getting record");
        const record = await contract.records(name);
        console.log("got record", record);
        console.log("getting domain");
        const owner = await contract.domains(name);
        console.log("got owner", owner);
        return {
          id: index,
          name: name,
          record: record,
          owner: owner,
        }
      }));
      setMints(mintRecords);
    } catch (error) {
      console.log(error);
    }
  }

  const onMintDomain = async () => {
    if (!domain) {
      return
    }
    if (domain.length < 3) {
      alert("Domain must be at least 3 characters long");
      return
    }
    const { ethereum } = window;
    if (!ethereum) {
      alert("Install metamask");
      return
    }
    setLoading(true);
    try {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

      // NOTE: this pricing should match backend pricing for polygon-ens Domains.sol
      const price = domain.length === 3 ? '0.5' : domain.length === 4 ? '0.3' : '0.1';

      let tx = await contract.register(domain, { value: ethers.utils.parseEther(price) });
      const txReceipt = await tx.wait();
      if (txReceipt.status === 1) {
        console.log(`Domain minted! https://mumbai.polygonscan.com/tx/${tx.hash}`);

        tx = await contract.setRecord(domain, record);
        await tx.wait();

        console.log(`Record set! https://www.mumbai.polygonscan.com/tx/${tx.hash}`);

        setTimeout(() => {
          fetchMints();
        }, 2000);

        setRecord("");
        setDomain("");
      }
    } catch (error) {
      alert("Transaction failed!");
      console.error(error);
    }
    setLoading(false);
  }

  const updateDomain = async () => {
    if (!record || !domain) { return }
    setLoading(true);
    console.log("Updating domain", domain, "with record", record);
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

        let tx = await contract.setRecord(domain, record);
        await tx.wait();
        console.log(`Record set https://mumbai.polygonscan.com/tx/${tx.hash}`);

        fetchMints();
        setRecord("");
        setDomain("");
      }
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  }

  const renderNotConnectedContainer = () => (
    <div className="connect-wallet-container">
      <img src="https://media.giphy.com/media/3ohhwytHcusSCXXOUg/giphy.gif" alt="Ninja gif" />
      <button className="cta-button connect-wallet-button" onClick={ connectWallet }>
        Connect Wallet
      </button>
    </div>
  );

  const switchNetwork = async () => {
    const { ethereum } = window;
    if (!ethereum) {
      alert("Install metamask");
      return
    }

    try {
      // Try to switch to the Mumbai testnet
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x13881' }], // Check networks.js for hexadecimal network ids
      });
    } catch (error) {
      // This error code means that the chain we want has not been added to MetaMask
      // In this case we ask the user to add it to their MetaMask
      if (error.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x13881',
                chainName: 'Polygon Mumbai Testnet',
                rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
                nativeCurrency: {
                    name: "Mumbai Matic",
                    symbol: "MATIC",
                    decimals: 18
                },
                blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
              },
            ],
          });
        } catch (error) {
          console.log(error);
        }
      }
      console.log(error);
    }
  }

  const editRecord = (name) => {
    setEditing(true);
    setDomain(name);
  }

  const renderMints = () => {
    if (!currentAccount || mints.length === 0) {
      return
    }
    return (
      <div className="mint-container">
        <p className="subtitle"> Recently minted domains!</p>
        <div className="mint-list">
          { mints.map((mint, index) => {
            return (
              <div className="mint-item" key={index}>
                <div className='mint-row'>
                  <a className="link" href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`} target="_blank" rel="noopener noreferrer">
                    <p className="underlined">{' '}{mint.name}.{tld}{' '}</p>
                  </a>
                  {/* If mint.owner is currentAccount, add an "edit" button*/}
                  { mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
                    <button className="edit-button" onClick={() => editRecord(mint.name)}>
                      <img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
                    </button>
                    :
                    null
                  }
                </div>
                <p> {mint.record} </p>
              </div>)
            })
          }
        </div>
      </div>
    );
  }

  const renderInputForm = () => {
    if (network !== 'Polygon Mumbai Testnet') {
      return (
        <div className="connect-wallet-container">
          <p>Please connect to the Polygon Mumbai Testnet</p>
          <button className='cta-button mint-button' onClick={switchNetwork}>Click here to switch</button>
        </div>
      );
    }

    return (
      <div className="form-container">
        <div className="first-row">
          <input
            type="text"
            value={domain}
            placeholder='set domain'
            onChange={e => setDomain(e.target.value)}
          />
          <p className='tld'> .{tld} </p>
        </div>

        <input
          type="text"
          value={record}
          placeholder='set record'
          onChange={e => setRecord(e.target.value)}
        />

        { loading && <p>Loading...</p>}
        <div className="button-container">
          {
            editing ? (
              <React.Fragment>
                <button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
                  Set record
                </button>
                <button className='cta-button mint-button' disabled={null} onClick={() => setEditing(false) }>
                  Cancel
                </button>
              </React.Fragment>
            ) : (
              <button className='cta-button mint-button' disabled={loading} onClick={onMintDomain}>
                Mint
              </button>
            )
          }
        </div>

      </div>
    )
  };

  const renderConnectedContainer = () => (
    <div>
      { renderInputForm() }
    </div>
  );

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  useEffect(() => {
    if (network === "Polygon Mumbai Testnet") {
      fetchMints();
    }
  }, [network, currentAccount]);

  return (
    <div className="App">
      <div className="container">

        <div className="header-container">
          <header>
            <div className="left">
              <p className="title">🐱‍👤 YSM Name Service</p>
              <p className="subtitle">Your YSM access!</p>
            </div>
            <div className="right">
              <img alt="Network logo" className="logo" src={ network.includes("Polygon") ? polygonLogo : ethLogo} />
              { currentAccount ? <p> Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Not connected </p> }
            </div>
          </header>
        </div>

        { !currentAccount ? renderNotConnectedContainer() : renderConnectedContainer() }
        { renderMints() }

        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built with @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
}

export default App;
