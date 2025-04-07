import axios from 'axios';

async function getSpeakers() {
    try {
        const response = await axios.get('http://localhost:50021/speakers');
        return response.data;
    } catch (error) {
        console.error("Error fetching speakers:", error);
        return null;
    }
}

async function getSpeakerslist() {
    const speakers = await getSpeakers();
    if (speakers) {
        // Extract the id and name from each speaker and sort by id
        const speakerList = speakers.flatMap(speaker => 
            speaker.styles.map(style => ({
            id: style.id,
            name: speaker.name,
            type: style.name,
            }))
        ).sort((a, b) => a.id - b.id);

        console.log(speakerList);
        return speakerList;
    } else {
        console.log("Failed to retrieve speakers.");
        return [];
    }
}

export  { getSpeakerslist };