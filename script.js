// sounds
const successSound = document.getElementById("successSound");
const errorSound = document.getElementById("errorSound");

// Get form element
const form = document.getElementById("sentimentForm");

// Initialize Supabase
const { createClient } = window.supabase;
const SUPABASE_URL = "https://xxkpsmtlsghphkcbqnda.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4a3BzbXRsc2docGhrY2JxbmRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyOTY2MzksImV4cCI6MjA1ODg3MjYzOX0.KCmZyE4jcF4f8BYkkPBmIuDM2eCIRIl4O0FzBC2eWc8";
const IPINFO_TOKEN = "8a426bbaca9e24";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Function to get user details (IP, location, browser, device, isp)
async function getUserInfo() {
    let ip = "Unknown", location = "Unknown", device = "Unknown", browser = "Unknown", isp = "Unknown";

    // Fetch IP and location from API
    try {
        const response = await fetch("https://ipinfo.io/json?token=" + IPINFO_TOKEN);
        const data = await response.json();
        ip = data.ip;
        location = `${data.city}, ${data.region}, ${data.country}`;
        isp = data.org;
    } catch (err) {
        console.error("Error fetching IP:", err);
    }

    // Get browser & device details
    browser = navigator.userAgent;
    device = /Mobi|Android/i.test(navigator.userAgent) ? "Mobile" : "Desktop";

    return { ip, location, device, browser, isp };
}

async function storeData(event) {
    event.preventDefault(); // Prevent page reload

    // Fetch form values
    const name = document.getElementById("name").value.trim();
    const sex = document.getElementById("sex").value;
    const age = document.getElementById("age").value.trim();
    const sentiment = document.getElementById("sentiment").value;
    const comments = document.getElementById("comments").value.trim();

    // Check if required fields are filled
    if (!name || !sex || !sentiment) {
        errorSound.play();
        alert("Please fill in all required fields!");
        return;
    }

    // Get user info
    const userInfo = await getUserInfo();

    try {
        // Insert data into Supabase
        const { data, error } = await supabase
            .from("submissions")
            .insert([
                {
                    name,
                    sex,
                    age: age ? parseInt(age) : null,
                    sentiment,
                    comments,
                    ip_address: userInfo.ip,
                    location: userInfo.location,
                    device: userInfo.device,
                    browser: userInfo.browser,
                    isp: userInfo.isp
                }
            ]);

        if (error) {
            errorSound.play();
            alert("Error adding submission: " + error.message);
            return;
        }

        // ✅ Update count immediately after successful insertion
        updateSubmissionCount();

        successSound.play();
        alert("Form submitted successfully!");
    } catch (err) {
        errorSound.play();
        alert("Error: " + err.message);
    } finally {
        form.reset();
    }
}

// Function to Get Device & Browser Info
function getDeviceInfo() {
    const userAgent = navigator.userAgent;
    let device = "Desktop";

    if (/Mobi|Android/i.test(userAgent)) {
        device = "Mobile";
    } else if (/Tablet|iPad/i.test(userAgent)) {
        device = "Tablet";
    }

    return {
        browser: navigator.userAgentData ? navigator.userAgentData.brands[0].brand : navigator.userAgent,
        os: navigator.platform,
        device: device,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language
    };
}

// Function to Store Visit Data in Supabase
async function storeVisitData() {
    try {
        // Get User Metadata
        const { ip, location, isp } = await getUserInfo();
        const { browser, os, device, screenResolution, language } = getDeviceInfo();

        // Insert Data into Supabase
        const { data, error } = await supabase.from("visitors").insert([
            {
                ip_address: ip,
                location: location,
                isp: isp,
                browser: browser,
                os: os,
                device: device,
                screen_resolution: screenResolution,
                language: language,
                visit_time: new Date().toISOString()
            }
        ]);

        if (error) {
            console.error("Error storing visitor data:", error.message);
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

async function updateSubmissionCount() {
    try {
        // ✅ Fetch only the count of records
        const { count, error } = await supabase
            .from("submissions")
            .select("id", { count: "exact" }); // ✅ Corrected query

        if (error) {
            console.error("Error fetching submission count:", error.message);
            return;
        }

        // ✅ Update the submission count on the webpage
        document.getElementById("submissionCount").innerText = `Total Users Submitted: ${count ?? 0}`;
    } catch (err) {
        console.error("Error:", err.message);
    }
}

// ✅ Run When Page Loads
document.addEventListener("DOMContentLoaded", storeVisitData);

// ✅ Fetch count when page loads
document.addEventListener("DOMContentLoaded", updateSubmissionCount);

// Fetch news from the API and store it in Supabase
async function fetchAndStoreNews() {
    const totalPages = 10;  // We want to call the API 10 times
    const today = new Date().toISOString().split('T')[0];
    let allArticles = [];

    for (let page = 1; page <= totalPages; page++) {
        const response = await fetch(`https://api.thenewsapi.com/v1/news/top?api_token=ojZ4Ixd01hm607ESXWulk7DDKZygqotve8sVIC36&page=${page}&published_on=${today}&search=feminism%20|%20feminist%20|%20alimony%20|%20rape`);
        const dataReceived = await response.json();
        if (!dataReceived.data) {
            break;
        }

        // Collect all articles from all pages
        allArticles = allArticles.concat(dataReceived.data);
    }
    if (allArticles.length === 0) {
        console.log("No data fetched due to API issue");
        return;
    }
    const { data, error } = await supabase
        .from('news')
        .upsert(allArticles.map(article => ({
            title: article.title,
            url: article.url,
            image_url: article.image_url || 'https://placehold.co/600x400?text=News',
            published_at: article.published_at,
            date_fetched: new Date().toISOString().split('T')[0],  // Store the current date
            uuid: article.uuid
        })));

    if (error) {
        console.error("Error inserting data:", error);
    } else {
        console.log("News data successfully stored.");
    }
}

// Check if news for today already exists in the database
async function checkAndFetchNews() {
    const today = new Date().toISOString().split('T')[0];  // Get the current date (YYYY-MM-DD)

    // Check if there's already news data for today
    const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('date_fetched', today);

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    // If no data for today, fetch from the API and store it
    if (data.length === 0) {
        console.log("Fetching news as no data found for today...");
        await fetchAndStoreNews();
    } else {
        console.log("News already exists for today, displaying news...");
    }
}

// Call checkAndFetchNews when the page loads
document.addEventListener("DOMContentLoaded", async () => {
    await checkAndFetchNews();
    displayNews();
});

// Display the fetched news
async function displayNews() {
    const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('published_at', { ascending: false });

    const newsList = document.getElementById("news-list");
    newsList.innerHTML = ''; // Clear any existing news

    if (error) {
        console.error("Error fetching news:", error);
        return;
    }

    data.forEach(article => {
        let div = document.createElement("div");
        div.className = "news-item";
        div.innerHTML = `
            <img src="${article.image_url}" alt="News">
            <a href="${article.url}" target="_blank">${article.title}</a>
        `;
        newsList.appendChild(div);
    });
}