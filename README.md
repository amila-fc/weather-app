## Building & running

### Gradle  

1. Using the *Gradle Wrapper*. Depending on your OS, simply run the following command to build the application:

        ./gradlew assemble
		
	 or

        ./gradlew.bat assemble
   
2. Access to the Dark Sky API requires an API key. Set it through the following env variable:

        export DARK_SKY_API_KEY=<api-key>

3. Start application with `java -jar build/libs/weatherservice-1.0-SNAPSHOT.jar --darksky.apiKey=<api-key>`

4. To check that your application is running enter url `http://localhost:8080/status`
