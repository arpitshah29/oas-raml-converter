const Converter = require('../model/converter');
const _ = require('lodash');
const SecurityScope = require('../model/securityScope');
const Raml10MethodConverter = require('../raml10/raml10MethodConverter');



class Oas20SecurityDefinitionConverter extends Converter {

	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;

		models.map(model => {
			const swaggerDef = this._export(model);
			if (swaggerDef != null){
				result[model.schemaName] = swaggerDef;
			}
		});

		return result;
	}

	import(oasDefs) {
		const result = [];
		if (_.isEmpty(oasDefs)) return result;

		for (const id in oasDefs) {
			if (!oasDefs.hasOwnProperty(id)) continue;
			const oasDef = oasDefs[id];
			oasDef.schemaName = id;
			result.push(this._import(oasDef));
		}

		return result;
	}

	_export(model) {
		const attrIdMap = {};

		const attrIdSkip = [
			'type','schemaName', 'authorization', 'scopes', 'signatures', 'displayName',
			'describedBy', 'requestTokenUri', 'tokenUrl', 'authorizationUrl', 'name', '_in'
		];

		const oasValidSecurityTypes = ['oauth2', 'basic', 'apiKey'];

		const swaggerDef = Converter.copyObjectFrom(model, attrIdMap, attrIdSkip);

		if (oasValidSecurityTypes.indexOf(model.type) < 0) return;
		else swaggerDef.type = model.type;

		switch (model.type){
			case 'oauth2' :
				const authorizationUrlValidFlows = ['implicit', 'accessCode'];
				const tokenUrlValidFlows = ['application', 'password', 'accessCode'];
				if (model.hasOwnProperty('authorization')) swaggerDef.flow = model.authorization[0];

				if (_.includes(authorizationUrlValidFlows, swaggerDef.flow)) swaggerDef.authorizationUrl = model.authorizationUrl;
				if (_.includes(tokenUrlValidFlows, swaggerDef.flow)) swaggerDef.tokenUrl = model.tokenUrl;

				swaggerDef.scopes = {};
				if (model.hasOwnProperty('scopes')) {
					for (const id in model.scopes) {
						if (!model.scopes.hasOwnProperty(id)) continue;
						let scope = model.scopes[id];
						swaggerDef.scopes[scope.value] = scope.description;
					}
				}
				break;

			case 'apiKey' :
				if (model.hasOwnProperty('_in')) swaggerDef.in = model._in;
				if (model.hasOwnProperty('name')) swaggerDef.name = model.name;
				break;
		}

		return swaggerDef;
	}

	_import(securityDef) {
		const attrIdMap = {
			"in" : "_in"
		};

		const attrIdSkip = ['flow', 'scopes'];

		const model = Converter.copyObjectFrom(securityDef, attrIdMap, attrIdSkip);

		if (securityDef.hasOwnProperty('flow')) model.authorization = [securityDef.flow];
		if (securityDef.hasOwnProperty('scopes')) {
			model.scopes = [];
			for (const id in securityDef.scopes) {
				if (!securityDef.scopes.hasOwnProperty(id)) continue;
				let scope = new SecurityScope();
				scope.value = id;
				scope.description = securityDef.scopes[id];
				model.scopes.push(scope);
			}
		}

		if (model._in && model.name) {
			let describedBy = {};
			if (model._in === 'header'){
				describedBy.headers = {};
				describedBy.headers[model.name] = {type: ['string']};
			}
			else if (model._in === 'query') {
				describedBy.queryParameter = {};
				describedBy.queryParameter[model.name] = {type: ['string']};
			}
			const raml10MethodConverter = new Raml10MethodConverter();
			model.describedBy = raml10MethodConverter._import(describedBy);
		}

		return model;
	}
}

module.exports = Oas20SecurityDefinitionConverter;