// This file defines the CI/CD pipeline stages
pipeline {
    // Run on any available Jenkins agent
    agent any

    // Environment variables used throughout the pipeline
    environment {
        // --- !!! CONFIGURE THESE VARIABLES !!! ---
        AWS_REGION       = 'us-east-1' // 1. Change to your AWS region
        ECR_REPO_NAME    = 'my-web-app' // 2. Change to your ECR repository name
        EC2_HOST         = 'ec2-xx-xx-xx-xx.compute-1.amazonaws.com' // 3. Change to your EC2 Public IP/DNS
        EC2_USER         = 'ec2-user' // User for Amazon Linux 2
        ADMIN_EMAIL      = 'your-email@example.com' // 4. Change to your email for notifications
        GITHUB_REPO_URL  = 'https://github.com/YOUR_USERNAME/YOUR_REPO.git' // 5. Change to your repo URL
        // --- !!! END OF CONFIGURATION !!! ---
        
        // Dynamically get AWS Account ID
        AWS_ACCOUNT_ID   = sh(script: 'aws sts get-caller-identity --query Account --output text', returnStdout: true).trim()
        ECR_REGISTRY     = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        // Set the image name using the ECR registry, repo name, and Jenkins build number
        IMAGE_NAME       = "${ECR_REGISTRY}/${ECR_REPO_NAME}:${BUILD_NUMBER}"
    }

    stages {
        // --- 1. SOURCE CODE MANAGEMENT ---
        stage('Checkout') {
            steps {
                echo 'Checking out code from GitHub...'
                // Automatically checks out the code from the repo configured in the pipeline job
                git branch: 'main', url: env.GITHUB_REPO_URL
            }
        }

        // --- 2. CONTINUOUS INTEGRATION (Build) ---
        stage('Build') {
            steps {
                echo 'Building the application (npm install)...'
                // Installs Node.js dependencies using the node:18-alpine docker image
                // This avoids needing Node.js installed on the Jenkins agent
                docker.image('node:18-alpine').inside {
                    sh 'npm install'
                }
            }
        }

        // --- 2. CONTINUOUS INTEGRATION (Test) ---
        stage('Test') {
            steps {
                echo 'Running unit tests...'
                // Runs the "test" script defined in package.json
                docker.image('node:18-alpine').inside {
                    sh 'npm test'
                }
            }
        }

        // --- 3. CONTAINERIZATION & PUSH ---
        stage('Build & Push to ECR') {
            steps {
                echo "Building Docker image: ${IMAGE_NAME}"
                
                // Use AWS credentials stored in Jenkins (ID: 'aws-credentials')
                withAWS(credentials: 'aws-credentials', region: env.AWS_REGION) {
                    
                    // Get ECR login token
                    def ecrLoginToken = sh(
                        script: "aws ecr get-login-password --region ${env.AWS_REGION}", 
                        returnStdout: true
                    ).trim()
                    
                    // Log Docker into ECR
                    sh "docker login --username AWS --password '${ecrLoginToken}' ${ECR_REGISTRY}"
                    
                    // Build the Docker image using the Dockerfile in the current directory
                    def dockerImage = docker.build(env.ECR_REPO_NAME, "--tag ${IMAGE_NAME} .")
                    
                    // Push the image to ECR
                    echo "Pushing image to ECR..."
                    dockerImage.push()
                    
                    echo "Image push complete: ${IMAGE_NAME}"
                }
            }
        }
        
        // --- 4. CONTINUOUS DEPLOYMENT ---
        stage('Deploy to EC2') {
            steps {
                echo "Deploying ${IMAGE_NAME} to ${EC2_HOST}..."
                
                // Use SSH credentials stored in Jenkins (ID: 'ec2-ssh-key')
                sshagent(credentials: ['ec2-ssh-key']) {
                    
                    // Copy the docker-compose.yml file to the EC2 instance
                    sh "scp -o StrictHostKeyChecking=no docker-compose.yml ${EC2_USER}@${EC2_HOST}:~/docker-compose.yml"
                    
                    // SSH into the EC2 instance and run deployment commands
                    sh """
                        ssh -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_HOST} '''
                            # Set the new image name as an environment variable
                            # This IMAGE_NAME is read by the docker-compose.yml file
                            export IMAGE_NAME=${IMAGE_NAME}
                            export AWS_REGION=${AWS_REGION}
                            export ECR_REGISTRY=${ECR_REGISTRY}
                            
                            # Log in to ECR on the EC2 instance
                            # This ensures the instance can pull the private image
                            aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
                            
                            # Pull the new image from ECR
                            docker-compose -f ~/docker-compose.yml pull
                            
                            # Stop and restart the service with the new image
                            # 'docker-compose up -d' will recreate the container if the image has changed
                            docker-compose -f ~/docker-compose.yml up -d
                            
                            echo "Deployment successful!"
                        '''
                    """
                }
            }
        }
    }
    
    // --- 5. MONITORING & NOTIFICATION ---
    post {
        // Always clean up the workspace
        always {
            echo 'Cleaning up workspace...'
            cleanWs()
        }
        // Send an email on success
        success {
            echo 'Pipeline successful. Sending notification...'
            mail to: env.ADMIN_EMAIL,
                 subject: "SUCCESS: Pipeline '${env.JOB_NAME}' (Build #${env.BUILD_NUMBER})",
                 body: "Pipeline finished successfully. View build at ${env.BUILD_URL}"
        }
        // Send an email on failure
        failure {
            echo 'Pipeline failed. Sending notification...'
            mail to: env.ADMIN_EMAIL,
                 subject: "FAILED: Pipeline '${env.JOB_NAME}' (Build #${env.BUILD_NUMBER})",
                 body: "Pipeline failed. View build at ${env.BUILD_URL}"
        }
    }
}

