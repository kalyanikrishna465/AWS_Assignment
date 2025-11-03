// This Jenkinsfile defines the CI/CD pipeline.
// It must be in the root of your GitHub repository.

pipeline {
    agent any // Run on any available Jenkins agent

    // Environment variables used throughout the pipeline
    environment {
        // --- YOU MUST EDIT THESE ---
        AWS_REGION               = "us-east-1" // Change to your AWS region
        ECR_REGISTRY             = "YOUR_AWS_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com" // Change Account ID and Region
        ECR_REPOSITORY           = "my-web-app" // Change to your ECR repository name
        DEPLOY_SERVER_IP         = "YOUR_DEPLOYMENT_EC2_PUBLIC_IP" // Change to your deployment server's IP
        // --- NO EDITS NEEDED BELOW ---
        APP_NAME                 = "my-web-app"
        DEPLOY_SERVER_USER       = "ec2-user"
        DEPLOY_SERVER_KEY_ID     = "deploy-server-key" // The ID of the credential in Jenkins
        IMAGE_TAG                = "${ECR_REGISTRY}/${ECR_REPOSITORY}:${BUILD_NUMBER}"
    }

    stages {
        // Stage 1: Checkout code from GitHub
        stage('Checkout') {
            steps {
                echo 'Checking out code...'
                git branch: 'main', url: 'https://github.com/your-username/my-cicd-app.git' // *** CHANGE THIS TO YOUR REPO URL ***
            }
        }

        // Stage 2: Build the Node.js application (and run tests)
        stage('Build & Test') {
            steps {
                echo 'Building and testing the application...'
                // We use a Docker container to build, keeping the Jenkins agent clean
                docker.image('node:18-alpine').inside {
                    sh 'cd app && npm install'
                    sh 'cd app && npm test'
                }
            }
        }

        // Stage 3: Build the Docker Image
        stage('Build Docker Image') {
            steps {
                echo "Building Docker image: ${IMAGE_TAG}"
                // Build the image using the Dockerfile in the 'app' directory
                sh "docker build -t ${IMAGE_TAG} ./app"
            }
        }

        // Stage 4: Push Image to AWS ECR
        stage('Push to ECR') {
            steps {
                echo "Pushing Docker image to ECR..."
                // Use the Amazon ECR plugin to get login credentials
                // This uses the EC2 Instance's IAM Role automatically
                sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}"
                sh "docker push ${IMAGE_TAG}"
            }
        }

        // Stage 5: Deploy to EC2 Instance
        stage('Deploy to EC2') {
            steps {
                echo "Deploying application to ${DEPLOY_SERVER_IP}..."
                // Use the SSH key credential stored in Jenkins
                withCredentials([sshUserPrivateKey(credentialsId: "${DEPLOY_SERVER_KEY_ID}", keyFileVariable: 'SSH_KEY_FILE')]) {
                    // SSH into the deployment server and run the deploy commands
                    sh """
                        ssh -o StrictHostKeyChecking=no -i \${SSH_KEY_FILE} ${DEPLOY_SERVER_USER}@${DEPLOY_SERVER_IP} '
                        
                        # Log in to ECR (uses the EC2 instance's IAM Role)
                        echo 'Logging into ECR on deploy server...'
                        aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
                        
                        # Pull the new image
                        echo 'Pulling new image...'
                        docker pull ${IMAGE_TAG}
                        
                        # Stop and remove the old container, if it exists
                        echo 'Stopping and removing old container...'
                        docker stop ${APP_NAME} || true
                        docker rm ${APP_NAME} || true
                        
                        # Run the new container
                        echo 'Running new container...'
                        docker run -d -p 3000:3000 --name ${APP_NAME} ${IMAGE_TAG}
                        
                        echo 'Deployment complete.'
                        '
                    """
                }
            }
        }
    }

    // Post-build actions: run regardless of pipeline status
    post {
        // Send an email notification
        always {
            echo 'Pipeline finished. Sending email...'
            mail to: 'your-email@example.com', // *** CHANGE THIS ***
                 subject: "Pipeline ${currentBuild.fullDisplayName}: ${currentBuild.result}",
                 body: "Check pipeline status at ${env.BUILD_URL}"
        }
    }
}
