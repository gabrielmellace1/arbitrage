let isEnabled = false;

function updateUI(prices) {
    if (prices) {
        document.getElementById('eth-price').textContent = 
            prices.ethereum ? `${prices.ethereum.toFixed(6)} USD` : 'N/A';
        document.getElementById('blast-price').textContent = 
            prices.blast ? `${prices.blast.toFixed(6)} USD` : 'N/A';
        document.getElementById('price-diff').textContent = 
            prices.difference ? `${prices.difference.toFixed(2)}%` : 'N/A';
        document.getElementById('last-update').textContent = 
            prices.timestamp ? new Date(prices.timestamp).toLocaleString() : 'Never';
    }
}

function updateBotStatus() {
    const statusElement = document.getElementById('bot-status');
    const toggleButton = document.getElementById('toggle-bot');
    
    statusElement.textContent = isEnabled ? 'Running' : 'Stopped';
    statusElement.className = isEnabled ? 'text-green-600' : 'text-red-600';
    
    toggleButton.textContent = isEnabled ? 'Stop Bot' : 'Start Bot';
    toggleButton.className = `px-4 py-2 rounded-lg font-semibold text-white ${
        isEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
    } transition-colors`;
}

async function toggleBot() {
    try {
        const response = await fetch('/api/toggle', { method: 'POST' });
        const data = await response.json();
        isEnabled = data.isEnabled;
        updateBotStatus();
    } catch (error) {
        console.error('Error toggling bot:', error);
    }
}

async function fetchPrices() {
    try {
        const response = await fetch('/api/prices');
        const prices = await response.json();
        updateUI(prices);
    } catch (error) {
        console.error('Error fetching prices:', error);
    }
}

async function fetchStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        isEnabled = data.isEnabled;
        updateBotStatus();
    } catch (error) {
        console.error('Error fetching status:', error);
    }
}

// Initialize
document.getElementById('toggle-bot').addEventListener('click', toggleBot);

// Initial fetch
fetchStatus();
fetchPrices();

// Start polling
setInterval(fetchPrices, 1000);