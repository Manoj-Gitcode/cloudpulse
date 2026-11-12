pipeline {
  agent any
  stages {
    stage('Install dependencies') {
      steps {
        dir('backend') {
          sh 'python3 -m venv venv && ./venv/bin/pip install -r requirements.txt pytest'
        }
      }
    }
    stage('Test') {
      steps {
        dir('backend') {
          sh './venv/bin/python -m pytest'
        }
      }
    }
    stage('Package') {
      steps {
        sh 'tar --exclude=venv --exclude=__pycache__ -czf cloudpulse-${BUILD_NUMBER}.tgz backend Dockerfile'
      }
    }
  }
  post {
    success {
      archiveArtifacts artifacts: '*.tgz', fingerprint: true
    }
  }
}
