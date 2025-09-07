package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"math/rand"
	"net/http"
	"time"
)

func getRandomMessage() string {
	messages := []string{
		"Hello from the server!",
		"The time is now " + time.Now().Format("15:04:05"),
		"Rainbow makes server-driven UI simple",
		"This message was chosen randomly",
		"Click the button for a new message",
	}
	return messages[rand.Intn(len(messages))]
}

const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
    <title>Rainbow Simple Demo</title>
    <style>
        /* Prevent FOUC */
        :not(:defined) { visibility: hidden; }
        
        body {
            font-family: system-ui, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
        }
    </style>
</head>
<body>
    <rain-bow 
        page-data='{{.PageData}}' 
        global-data='{{.GlobalData}}'>
        
        <simple-message></simple-message>
    </rain-bow>

    <script type="module" src="/static/app.js"></script>
</body>
</html>`

func main() {
	tmpl := template.Must(template.New("main").Parse(htmlTemplate))

	// Serve static files
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static/"))))

	// Main page
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Handle AJAX update requests
		if r.Method == "POST" {
			// Simulate server processing with 2s delay
			time.Sleep(2 * time.Second)

			// Pick a new random message
			message := getRandomMessage()

			response := map[string]interface{}{
				"pageData": map[string]interface{}{
					"message": message,
				},
				"globalData": map[string]interface{}{
					"csrf_token": "demo-token",
					"flash":      []string{"Message updated!"},
				},
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
			return
		}

		// Regular page load
		message := getRandomMessage()

		pageData := map[string]interface{}{
			"message": message,
		}

		globalData := map[string]interface{}{
			"csrf_token": "demo-token",
			"flash":      []string{},
		}

		pageDataJSON, _ := json.Marshal(pageData)
		globalDataJSON, _ := json.Marshal(globalData)

		data := struct {
			PageData   template.JS
			GlobalData template.JS
		}{
			PageData:   template.JS(pageDataJSON),
			GlobalData: template.JS(globalDataJSON),
		}

		tmpl.Execute(w, data)
	})

	fmt.Println("Simple Rainbow Demo")
	fmt.Println("http://localhost:8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}

