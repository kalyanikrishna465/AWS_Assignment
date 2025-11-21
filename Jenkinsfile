pipeline {
    // The pipeline agent runs on your Windows EC2 instance (Jenkins Node)
    agent any 

    stages {
        stage('Cleanup Old Container') {
            steps {
                echo 'Checking for and cleaning up old web server container...'
                // Uses powershell for cleanup on a Windows agent.
                powershell '''
                    $containerName = "Kalyani-Webserver"
                    # Check if the container exists
                    if (docker ps -a --format "{{.Names}}" | Select-String -Pattern $containerName) {
                        echo "Stopping existing container $containerName..."
                        docker stop $containerName
                        echo "Removing container $containerName..."
                        docker rm $containerName
                    } else {
                        echo "Container $containerName does not exist. Skipping cleanup."
                    }
                '''
            }
        }
        
        stage('Clone Repository') {
            steps {
                echo 'Cloning the latest code from GitHub...'
                // Clones the repo, including index.html, to the Jenkins workspace.
                git branch: 'main', url: 'https://github.com/kalyanikrishna465/AWS_Assignment.git'
            }
        }
        
        stage('Deploy Webserver') {
            steps {
                echo 'Starting new Nginx container and mounting volume...'
                // The deployment command using the Windows batch shell:
                // - "%cd%" is the current working directory (Jenkins workspace).
                // - The volume mount (-v) links the workspace (where index.html is) 
                //   to the Nginx content directory (/usr/share/nginx/html).
                // - Port 8081 on the EC2 host is mapped to port 80 in the container.
                bat '''
                    docker run --name Kalyani-Webserver -d -p 8081:80 -v "%cd%:/usr/share/nginx/html" nginx
                '''
            }
        }
    }
}